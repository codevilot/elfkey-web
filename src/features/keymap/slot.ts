import { KEYS, bindingLabel, MODIFIERS } from "../../lib/elfkey/draft";
import { usageCode } from "../../lib/elfkey/keycodes";
import type { KeyBinding } from "../../lib/elfkey/types";
import type { RawKey } from "../../lib/elfkey/protocol";
export interface SavedSlot {
  keyNumber: number;
  binding: KeyBinding | null;
  label: string;
}
export function decodeSlot(raw: RawKey): SavedSlot {
  const packet = raw.packets[0];
  if (
    raw.length === 8 &&
    packet &&
    (packet[1] === 129 || packet[1] === 1) &&
    (packet[2] ?? 255) < 16
  ) {
    const usage = packet[3] ?? 0;
    const code =
      usage === 0
        ? ""
        : KEYS.find(([, code]) => usageCode(code) === usage)?.[1];
    if (code !== undefined) {
      const binding: KeyBinding = {
        code,
        modifiers: MODIFIERS.filter((_, i) => !!((packet[2] ?? 0) & (1 << i))),
      };
      return {
        keyNumber: raw.keyNumber,
        binding,
        label: bindingLabel(binding),
      };
    }
  }
  return { keyNumber: raw.keyNumber, binding: null, label: "기존 고급 설정" };
}
export function sameBinding(
  a: KeyBinding | undefined,
  b: KeyBinding | null | undefined,
): boolean {
  return (
    !!a &&
    !!b &&
    a.code === b.code &&
    a.modifiers.length === b.modifiers.length &&
    a.modifiers.every((m) => b.modifiers.includes(m))
  );
}
