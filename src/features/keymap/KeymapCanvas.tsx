import type { DeviceController } from "../device/useDevice";
import { DeviceIllustration } from "../device/DeviceIllustration";
import { Icon } from "../../components/ui/Icon";
import { bindingLabel } from "../../lib/elfkey/draft";
import { sameBinding } from "./slot";
import type { KeymapController } from "./useKeymap";
export function KeymapCanvas({
  device,
  keymap,
  pedal,
}: {
  device: DeviceController;
  keymap: KeymapController;
  pedal: boolean;
}) {
  const count = device.profile?.keyNumbers.length ?? keymap.draft.count;
  return (
    <section className="panel canvas-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 · {pedal ? "페달" : "키"} 선택</span>
          <h2>{pedal ? "어느 페달을 바꿀까요?" : "바꿀 키를 선택해주세요"}</h2>
        </div>
        <span className="soft-tag">{pedal ? "풋스위치" : "매크로 키보드"}</span>
      </div>
      <div className="device-stage">
        <span className="stage-orbit stage-orbit--one" />
        <span className="stage-orbit stage-orbit--two" />
        <DeviceIllustration
          pedal={pedal}
          count={count}
          selected={keymap.selected}
          onSelect={keymap.setSelected}
          disabled={device.busy}
        />
        <div className="illustration-caption">
          <span className="blue-dot" />
          그림 속 {pedal ? "페달을" : "키를"} 눌러 선택할 수 있어요
        </div>
      </div>
      <div className={`slot-cards ${count > 6 ? "slot-cards--many" : ""}`}>
        {keymap.draft.keys.map((binding, index) => {
          const saved = device.slots[index],
            changed =
              saved &&
              !sameBinding(binding, saved.binding) &&
              (binding.code !== "" ||
                binding.modifiers.length > 0 ||
                saved.binding !== null),
            name =
              pedal && count === 3
                ? ["왼쪽 페달", "가운데 페달", "오른쪽 페달"][index]
                : `${pedal ? "페달" : "키"} ${device.profile?.keyNumbers[index] ?? index + 1}`;
          return (
            <button
              key={index}
              className={`slot-card ${keymap.selected === index ? "is-selected" : ""}`}
              disabled={device.busy}
              onClick={() => keymap.setSelected(index)}
              aria-pressed={keymap.selected === index}
            >
              <span className="slot-card__top">
                <span>{name}</span>
                <span className="slot-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <strong>{saved?.label ?? "연결 전"}</strong>
              <span className="slot-card__label">
                {saved ? "현재 기기에 저장된 키" : "USB 연결 후 읽어와요"}
              </span>
              {changed && (
                <span className="pending-binding">
                  <Icon name="arrow" size={13} />
                  {bindingLabel(binding)}
                  <small>변경 예정</small>
                </span>
              )}
              <span className="slot-card__selection">
                {keymap.selected === index ? (
                  <>
                    <Icon name="check" size={12} />
                    선택됨
                  </>
                ) : (
                  "선택하기"
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="canvas-note">
        <Icon name="info" size={16} />
        <span>
          {device.profile
            ? "현재 값은 기기에서 직접 읽었어요. 새 키는 오른쪽에서 지정해주세요."
            : "연결 전에는 화면만 미리 볼 수 있어요. 장치 연결 후 현재 설정이 표시돼요."}
        </span>
      </div>
    </section>
  );
}
