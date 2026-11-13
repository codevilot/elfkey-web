import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { downloadJson } from "../components/ui/files";
import { useDevice } from "../features/device/useDevice";
import { DeviceCard } from "../features/device/DeviceCard";
import { useKeymap } from "../features/keymap/useKeymap";
import { KeymapCanvas } from "../features/keymap/KeymapCanvas";
import { AssignmentPanel } from "../features/keymap/AssignmentPanel";
import { InputTester } from "../features/testing/InputTester";
import { Diagnostics } from "../features/diagnostics/Diagnostics";
import { PendingChanges } from "../features/keymap/PendingChanges";
import { errorMessage } from "../lib/elfkey/types";
export function App() {
  const device = useDevice(),
    keymap = useKeymap(),
    tester = useRef<HTMLTextAreaElement>(null),
    file = useRef<HTMLInputElement>(null),
    [fileError, setFileError] = useState("");
  const pedal =
    !device.profile ||
    /FS\d|FootSwitch|Switch|FS20PRO/.test(device.profile.model);
  useEffect(() => {
    if (device.connectionId > 0 && device.profile)
      keymap.readDevice(device.slots, device.profile.model);
  }, [device.connectionId]);
  useEffect(() => {
    if (device.stage === "ready" && device.lastSaved !== null)
      tester.current?.focus({ preventScroll: true });
  }, [device.stage, device.lastSaved]);
  const save = async (): Promise<void> => {
    const key = device.profile?.keyNumbers[keymap.selected];
    if (key === undefined) return;
    if (
      device.profile?.needFlash &&
      !confirm(
        "이 구형 모델은 모든 키를 백업하고 설정 영역 전체를 다시 씁니다. USB 연결을 유지해주세요. 계속할까요?",
      )
    )
      return;
    const binding = {
      code: keymap.binding.code,
      modifiers: [...keymap.binding.modifiers],
    };
    if (await device.save(key, binding)) keymap.acknowledgeSaved(key, binding);
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#workspace" className="brand" aria-label="ElfKey 작업 영역">
          <span className="brand-mark">
            e<span>↗</span>
          </span>
          <span>
            elfkey<span className="brand-sub">STUDIO</span>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <a href="#workspace" className="nav-item is-active">
          <Icon name="keyboard" />
          장치 키 설정<span>1</span>
        </a>
        <a href="#input-test" className="nav-item">
          <Icon name="check" />
          입력 테스트
        </a>
        <div className="sidebar-help">
          <span className="help-icon">
            <Icon name="usb" size={23} />
          </span>
          <strong>설치 없이, 바로 연결</strong>
          <p>
            USB로 연결한 장치를
            <br />
            브라우저에서 설정해요.
          </p>
          <span>
            Chrome · Edge <Icon name="arrow" size={14} />
          </span>
        </div>
        <div className="sidebar-foot">
          <i />
          모든 통신은 내 브라우저에서
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <span>워크스페이스</span>
            <Icon name="chevron" size={13} />
            <strong>장치 키 설정</strong>
          </div>
          <span className="web-badge">
            <Icon name="usb" size={13} />
            WebHID · 순수 웹
          </span>
        </header>
        <main id="workspace">
          <section className="page-heading">
            <div>
              <div className="heading-kicker">
                <span />
                MY DEVICE, MY SHORTCUT
              </div>
              <h1>한 번의 누름을, 내 방식대로.</h1>
              <p>연결한 장치의 키를 확인하고 원하는 단축키로 바꿔보세요.</p>
            </div>
            <span className="heading-art">
              <Icon name="spark" size={26} />
              <span>
                MAKE IT
                <br />
                YOURS.
              </span>
            </span>
          </section>
          <ol className="workflow">
            {["장치 연결", "페달·키 선택", "새 키 저장", "입력 확인"].map(
              (step, i) => (
                <li
                  key={step}
                  className={
                    i === 0 && device.profile
                      ? "is-done"
                      : i === 0 || device.profile
                        ? "is-current"
                        : ""
                  }
                >
                  <span>
                    {i === 0 && device.profile ? (
                      <Icon name="check" size={14} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {step}
                  {i < 3 && <Icon name="chevron" size={13} />}
                </li>
              ),
            )}
          </ol>
          <DeviceCard device={device} />
          <div
            role="status"
            aria-live="polite"
            className={`message message--${device.stage === "error" ? "error" : device.busy ? "busy" : "info"}`}
          >
            {device.busy ? (
              <span className="spinner" />
            ) : (
              <Icon
                name={device.lastSaved !== null ? "check" : "info"}
                size={18}
              />
            )}
            <span>{device.message}</span>
          </div>
          <PendingChanges device={device} keymap={keymap} />
          <div className="workspace-grid">
            <KeymapCanvas device={device} keymap={keymap} pedal={pedal} />
            <AssignmentPanel
              device={device}
              keymap={keymap}
              pedal={pedal}
              onSave={save}
            />
          </div>
          <div className="draft-tools">
            <span>
              <Icon name="info" size={14} />
              기기의 현재 값과 저장 전 초안은 따로 표시돼요.
            </span>
            <div>
              <Button
                variant="ghost"
                disabled={device.busy}
                onClick={() => downloadJson("elfkey-draft.json", keymap.draft)}
              >
                <Icon name="download" size={15} />
                설정 내보내기
              </Button>
              <Button
                variant="ghost"
                disabled={device.busy}
                onClick={() => file.current?.click()}
              >
                <Icon name="upload" size={15} />
                가져오기
              </Button>
              <input
                ref={file}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 100000)
                      throw new Error("설정 파일이 너무 커요.");
                    keymap.importDraft(
                      JSON.parse(await file.text()),
                      device.profile?.keyNumbers.length,
                    );
                    setFileError("");
                  } catch (error) {
                    setFileError(errorMessage(error));
                  }
                }}
              />
            </div>
          </div>
          {fileError && (
            <p role="alert" className="file-error">
              {fileError}
            </p>
          )}
          <div id="input-test">
            <InputTester ref={tester} disabled={device.busy} />
          </div>
          <Diagnostics device={device} />
          <footer>
            <span>
              elfkey studio <span>·</span> 내 장치를 위한 작은 작업실
            </span>
            <span>PCsensor 비공식 도구 · 기기별 실사용 확인 필요</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
