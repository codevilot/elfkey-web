import { useCallback, useEffect, useRef, useState } from "react";
import { ElfKeyProtocol, type RawKey } from "../../lib/elfkey/protocol";
import { WebHidTransport } from "../../lib/elfkey/transport";
import {
  configurationDevice,
  configurationFilters,
  configurationReportId,
} from "../../lib/elfkey/report-selection";
import { describeDevice } from "../../lib/elfkey/hid";
import { isElfKey } from "../../lib/elfkey/models";
import {
  errorMessage,
  type DeviceInfo,
  type KeyBinding,
  type LogEntry,
  type ModelProfile,
} from "../../lib/elfkey/types";
import { bindingLabel } from "../../lib/elfkey/draft";
import { decodeSlot, type SavedSlot } from "../keymap/slot";
export type DeviceStage =
  "disconnected" | "connecting" | "reading" | "ready" | "saving" | "error";
interface Session {
  device: HIDDevice;
  transport: WebHidTransport;
  protocol: ElfKeyProtocol;
}
export interface BackupFile {
  schema: "elfkey-raw-backup/v1";
  createdAt: string;
  device: DeviceInfo;
  model: string;
  keys: { keyNumber: number; length: number; packets: number[][] }[];
}
export function useDevice() {
  const session = useRef<Session | null>(null),
    epoch = useRef(0),
    operation = useRef(false);
  const [stage, setStage] = useState<DeviceStage>("disconnected");
  const [info, setInfo] = useState<DeviceInfo | null>(null),
    [profile, setProfile] = useState<ModelProfile | null>(null);
  const [slots, setSlots] = useState<SavedSlot[]>([]),
    [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState(
    "장치를 연결하면 현재 저장된 키부터 읽어올게요.",
  );
  const [backup, setBackup] = useState<BackupFile | null>(null),
    [connectionId, setConnectionId] = useState(0),
    [lastSaved, setLastSaved] = useState<number | null>(null);
  const busy =
    stage === "connecting" || stage === "reading" || stage === "saving";
  const log = useCallback(
    (message: string) =>
      setLogs((previous) => [
        ...previous.slice(-39),
        { time: new Date().toISOString(), message },
      ]),
    [],
  );
  const dispose = useCallback(() => {
    const old = session.current;
    session.current = null;
    old?.transport.dispose();
    if (old?.device.opened) void old.device.close().catch(() => {});
  }, []);
  useEffect(() => {
    if (!("hid" in navigator)) return;
    const disconnect = (event: HIDConnectionEvent) => {
      if (event.device !== session.current?.device) return;
      epoch.current++;
      dispose();
      setStage("disconnected");
      setInfo(null);
      setProfile(null);
      setSlots([]);
      setMessage("장치가 분리됐어요. USB 케이블을 다시 연결해주세요.");
      log("물리 장치 분리");
    };
    navigator.hid.addEventListener("disconnect", disconnect);
    return () => {
      epoch.current++;
      navigator.hid.removeEventListener("disconnect", disconnect);
      dispose();
    };
  }, [dispose, log]);
  const connect = async (
    mode: "chooser" | "restore" = "chooser",
  ): Promise<void> => {
    if (operation.current || session.current) return;
    if (!window.isSecureContext || !("hid" in navigator)) {
      setStage("error");
      setMessage(
        "데스크톱 Chrome 또는 Edge에서 HTTPS나 localhost로 열어주세요.",
      );
      return;
    }
    operation.current = true;
    const current = ++epoch.current;
    setStage("connecting");
    setMessage("장치 선택 창에서 연결할 장치를 선택해주세요.");
    let selected: HIDDevice | undefined, transport: WebHidTransport | undefined;
    try {
      const devices =
        mode === "restore"
          ? await navigator.hid.getDevices()
          : await navigator.hid.requestDevice({
              filters: configurationFilters(),
            });
      selected = configurationDevice(devices);
      if (!selected) {
        setStage("disconnected");
        setMessage(
          devices.length
            ? "설정용 USB 인터페이스를 찾지 못했어요."
            : "장치 선택을 취소했어요.",
        );
        return;
      }
      if (!isElfKey(selected.vendorId, selected.productId))
        throw new Error("지원하는 ElfKey 장치 ID가 아니에요.");
      await selected.open();
      transport = new WebHidTransport(
        selected,
        configurationReportId(selected),
      );
      const protocol = await ElfKeyProtocol.identify(
        transport,
        selected.vendorId,
        selected.productId,
      );
      if (current !== epoch.current) {
        transport.dispose();
        if (selected.opened) await selected.close();
        return;
      }
      session.current = { device: selected, transport, protocol };
      setInfo(describeDevice(selected));
      setProfile(protocol.profile);
      setStage("reading");
      setMessage("기기에 저장된 키를 읽고 있어요.");
      const raw = await protocol.readKeys();
      if (current !== epoch.current) return;
      setSlots(raw.map(decodeSlot));
      try {
        localStorage.setItem("elfkey-reconnect", "yes");
      } catch {}
      setConnectionId((id) => id + 1);
      setLastSaved(null);
      setStage("ready");
      setMessage(
        "현재 설정을 읽었어요. 그림에서 바꿀 페달이나 키를 선택해주세요.",
      );
      log(
        `${protocol.profile.model} · ${raw.length}개 설정 읽기 완료 · 설정 연결 해제`,
      );
    } catch (error) {
      transport?.dispose();
      if (selected?.opened) await selected.close().catch(() => {});
      session.current = null;
      if (current !== epoch.current) return;
      setStage("error");
      setProfile(null);
      setMessage(errorMessage(error));
      log(`연결 오류: ${errorMessage(error)}`);
    } finally {
      operation.current = false;
    }
  };
  const disconnect = async (): Promise<void> => {
    if (busy) return;
    epoch.current++;
    try {
      localStorage.setItem("elfkey-reconnect", "no");
    } catch {}
    dispose();
    setStage("disconnected");
    setInfo(null);
    setProfile(null);
    setSlots([]);
    setMessage("연결을 해제했어요. 초안은 이 브라우저에 남아 있어요.");
    log("사용자 연결 해제");
  };
  const save = async (
    keyNumber: number,
    binding: KeyBinding,
  ): Promise<boolean> => {
    const active = session.current;
    if (!active || operation.current || !info) return false;
    operation.current = true;
    const current = epoch.current;
    const oldLabel =
      slots.find((slot) => slot.keyNumber === keyNumber)?.label ?? "기존 설정";
    const index = active.protocol.profile.keyNumbers.indexOf(keyNumber);
    const target =
      active.protocol.profile.keyNumbers.length === 3
        ? ["왼쪽 페달", "가운데 페달", "오른쪽 페달"][index]
        : `키 ${keyNumber}`;
    setStage("saving");
    setLastSaved(null);
    setMessage(
      "원본 백업 → 기기에 저장 → 다시 읽기 → 설정 연결 해제 중이에요.",
    );
    try {
      await active.protocol.saveKey(keyNumber, binding, (raw: RawKey[]) =>
        setBackup({
          schema: "elfkey-raw-backup/v1",
          createdAt: new Date().toISOString(),
          device: info,
          model: active.protocol.profile.model,
          keys: raw.map((k) => ({
            ...k,
            packets: k.packets.map((p) => [...p]),
          })),
        }),
      );
      if (current !== epoch.current) return false;
      setSlots((previous) =>
        previous.map((slot) =>
          slot.keyNumber === keyNumber
            ? {
                keyNumber,
                binding: {
                  code: binding.code,
                  modifiers: [...binding.modifiers],
                },
                label: bindingLabel(binding),
              }
            : slot,
        ),
      );
      setLastSaved(keyNumber);
      setStage("ready");
      setMessage(
        `${target}: ${oldLabel} → ${bindingLabel(binding)} 저장 데이터를 확인했어요. 설정 연결은 해제했으며 실제 출력은 아래에서 눌러 확인해주세요.`,
      );
      log(`키 ${keyNumber} 저장·읽기 검증·설정 연결 해제 완료`);
      return true;
    } catch (error) {
      if (current === epoch.current) {
        setStage("error");
        setMessage(`저장 확인 실패: ${errorMessage(error)}`);
        log(`저장 오류: ${errorMessage(error)}`);
      }
      return false;
    } finally {
      operation.current = false;
    }
  };
  useEffect(() => {
    if (!("hid" in navigator) || typeof navigator.hid.getDevices !== "function")
      return;
    try {
      if (localStorage.getItem("elfkey-reconnect") === "no") return;
    } catch {}
    const timer = setTimeout(() => void connect("restore"), 100);
    return () => clearTimeout(timer);
  }, []);
  return {
    stage,
    info,
    profile,
    slots,
    message,
    logs,
    backup,
    connectionId,
    lastSaved,
    busy,
    connect,
    disconnect,
    save,
  };
}
export type DeviceController = ReturnType<typeof useDevice>;
