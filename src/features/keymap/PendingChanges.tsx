import { Icon } from "../../components/ui/Icon";
import { bindingLabel } from "../../lib/elfkey/draft";
import { sameBinding } from "./slot";
import type { DeviceController } from "../device/useDevice";
import type { KeymapController } from "./useKeymap";
export function PendingChanges({
  device,
  keymap,
}: {
  device: DeviceController;
  keymap: KeymapController;
}) {
  const changes = device.slots.flatMap((slot, index) => {
    const binding = keymap.draft.keys[index];
    if (
      !binding ||
      sameBinding(binding, slot.binding) ||
      (!slot.binding && !binding.code && !binding.modifiers.length)
    )
      return [];
    return [{ index, slot, binding }];
  });
  if (!changes.length) return null;
  return (
    <section className="pending-summary" aria-label="아직 저장하지 않은 변경">
      <div>
        <Icon name="info" size={17} />
        <strong>아직 기기에 저장하지 않은 변경 {changes.length}개</strong>
      </div>
      <div>
        {changes.map(({ index, slot, binding }) => (
          <button
            key={slot.keyNumber}
            disabled={device.busy}
            onClick={() => keymap.setSelected(index)}
          >
            <span>
              {device.slots.length === 3
                ? ["왼쪽 페달", "가운데 페달", "오른쪽 페달"][index]
                : `키 ${slot.keyNumber}`}
            </span>
            <s>{slot.label}</s>
            <Icon name="arrow" size={12} />
            <strong>{bindingLabel(binding)}</strong>
            <span>
              {keymap.selected === index
                ? "오른쪽 저장 버튼을 눌러주세요"
                : "이 변경 선택하기"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
