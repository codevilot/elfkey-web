import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { KEYS, MODIFIERS, bindingLabel } from "../../lib/elfkey/draft";
import type { DeviceController } from "../device/useDevice";
import type { KeymapController } from "./useKeymap";
import { sameBinding } from "./slot";
interface Props {
  device: DeviceController;
  keymap: KeymapController;
  pedal: boolean;
  onSave: () => Promise<void>;
}
export function AssignmentPanel({ device, keymap, pedal, onSave }: Props) {
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    if (!capturing) return;
    const keydown = (event: KeyboardEvent) => {
      if (device.busy) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        setCapturing(false);
        return;
      }
      if (!KEYS.some(([, code]) => code === event.code)) return;
      keymap.change({
        code: event.code,
        modifiers: MODIFIERS.filter((m) => event.getModifierState(m)),
      });
      setCapturing(false);
    };
    const blur = () => setCapturing(false);
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("blur", blur);
    };
  }, [capturing, device.busy, keymap]);
  const saved = device.slots[keymap.selected],
    dirty =
      saved &&
      !sameBinding(keymap.binding, saved.binding) &&
      (!!saved.binding ||
        !!keymap.binding.code ||
        keymap.binding.modifiers.length > 0);
  const name =
    pedal && keymap.draft.count === 3
      ? ["왼쪽 페달", "가운데 페달", "오른쪽 페달"][keymap.selected]
      : `${pedal ? "페달" : "키"} ${device.profile?.keyNumbers[keymap.selected] ?? keymap.selected + 1}`;
  const isSaved = device.lastSaved === (saved?.keyNumber ?? -1) && !dirty;
  return (
    <section className="panel assignment-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">02 · 새 키 지정</span>
          <h2>{name}</h2>
        </div>
        <span className="selected-key-icon">
          <Icon name="keyboard" />
        </span>
      </div>
      <div className="current-value">
        <span>현재 저장값</span>
        <strong>{saved?.label ?? "장치 연결 전"}</strong>
      </div>
      <label className="field-label" htmlFor="keyChoice">
        이 키로 바꿀게요
      </label>
      <select
        id="keyChoice"
        value={keymap.binding.code}
        disabled={device.busy}
        onChange={(e) =>
          keymap.change({ ...keymap.binding, code: e.target.value })
        }
      >
        <option value="">할당 안 함</option>
        {KEYS.map(([label, code]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <span className="field-label">
        함께 누를 조합키 <small>선택 사항</small>
      </span>
      <div className="modifier-buttons">
        {MODIFIERS.map((m) => (
          <button
            type="button"
            key={m}
            aria-pressed={keymap.binding.modifiers.includes(m)}
            disabled={device.busy}
            onClick={() =>
              keymap.change({
                ...keymap.binding,
                modifiers: keymap.binding.modifiers.includes(m)
                  ? keymap.binding.modifiers.filter((x) => x !== m)
                  : [...keymap.binding.modifiers, m],
              })
            }
          >
            {
              { Control: "Ctrl", Shift: "Shift", Alt: "Alt", Meta: "Win / ⌘" }[
                m
              ]
            }
          </button>
        ))}
      </div>
      <div className="binding-preview">
        <span>변경할 키</span>
        <div>
          {keymap.binding.code || keymap.binding.modifiers.length ? (
            <kbd>{bindingLabel(keymap.binding)}</kbd>
          ) : (
            <span className="empty-binding">키를 골라주세요</span>
          )}
        </div>
      </div>
      <Button
        id="capture"
        className="full-width"
        disabled={device.busy}
        onClick={() => setCapturing((value) => !value)}
        aria-pressed={capturing}
      >
        <Icon name="keyboard" size={17} />
        {capturing ? "키 입력 대기 중… Esc로 취소" : "키보드로 직접 입력하기"}
      </Button>
      <div className="save-area">
        <div className="save-step">
          <span>03</span>
          <div>
            <strong>기기에 저장</strong>
            <p>저장 전에는 실제 페달 동작이 바뀌지 않아요.</p>
          </div>
        </div>
        <Button
          variant="primary"
          id="saveDevice"
          className="full-width save-button"
          disabled={!device.profile || device.busy || !dirty}
          onClick={() => {
            setCapturing(false);
            void onSave();
          }}
        >
          {device.stage === "saving" ? (
            <>
              <span className="spinner" />
              저장하고 확인 중…
            </>
          ) : isSaved ? (
            <>
              <Icon name="check" />
              {name} · 저장 데이터 확인됨
            </>
          ) : (
            <>
              {name} · {bindingLabel(keymap.binding)} 저장
              <Icon name="arrow" size={17} />
            </>
          )}
        </Button>
        <p className="fine-print">
          {device.profile
            ? "원본 백업 → 저장 → 읽기 검증 → 설정 연결 해제"
            : "먼저 USB 장치를 연결해주세요."}
        </p>
      </div>
    </section>
  );
}
