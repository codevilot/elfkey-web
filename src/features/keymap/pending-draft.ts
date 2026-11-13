import { emptyDraft, validateDraft } from "../../lib/elfkey/draft";
import type { Draft } from "../../lib/elfkey/types";
import { sameBinding, type SavedSlot } from "./slot";
export function pendingIndices(draft: Draft, slots: SavedSlot[]): number[] {
  return slots.flatMap((slot, index) => {
    const binding = draft.keys[index];
    return binding &&
      !sameBinding(binding, slot.binding) &&
      (!!slot.binding || !!binding.code || binding.modifiers.length > 0)
      ? [index]
      : [];
  });
}
export function restorePending(
  value: unknown,
  model: string,
  slots: SavedSlot[],
): Draft {
  const clean = emptyDraft(slots.length);
  clean.keys = slots.map((s) => s.binding ?? { code: "", modifiers: [] });
  if (!value || typeof value !== "object") return clean;
  const record = value as {
    schema?: unknown;
    model?: unknown;
    draft?: unknown;
    indices?: unknown;
  };
  if (
    record.schema !== "elfkey-pending/v1" ||
    record.model !== model ||
    !Array.isArray(record.indices)
  )
    return clean;
  try {
    const draft = validateDraft(record.draft);
    if (draft.count !== slots.length) return clean;
    for (const index of record.indices)
      if (
        typeof index === "number" &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < slots.length
      ) {
        const binding = draft.keys[index];
        if (binding) clean.keys[index] = binding;
      }
  } catch {}
  return clean;
}
