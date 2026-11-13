import { useEffect, useState } from "react";
import { emptyDraft, validateDraft } from "../../lib/elfkey/draft";
import type { Draft, KeyBinding } from "../../lib/elfkey/types";
import type { SavedSlot } from "./slot";
import { pendingIndices, restorePending } from "./pending-draft";
function initial(): Draft {
  try {
    const raw = localStorage.getItem("elfkey-draft");
    if (raw) return validateDraft(JSON.parse(raw));
  } catch {}
  return emptyDraft(3);
}
export function useKeymap() {
  const [draft, setDraft] = useState<Draft>(initial),
    [selected, setSelected] = useState(0);
  const [model, setModel] = useState<string | null>(null),
    [baseline, setBaseline] = useState<SavedSlot[]>([]);
  useEffect(() => {
    if (!model || baseline.length !== draft.count) return;
    try {
      const indices = pendingIndices(draft, baseline);
      const key = `elfkey-pending:${model}`;
      if (indices.length)
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: "elfkey-pending/v1",
            model,
            draft,
            indices,
          }),
        );
      else localStorage.removeItem(key);
    } catch {}
  }, [draft, model, baseline]);
  useEffect(() => {
    try {
      localStorage.setItem("elfkey-draft", JSON.stringify(draft));
    } catch {}
  }, [draft]);
  const change = (binding: KeyBinding): void =>
    setDraft((previous) => ({
      ...previous,
      keys: previous.keys.map((key, i) => (i === selected ? binding : key)),
    }));
  const readDevice = (slots: SavedSlot[], model: string): void => {
    let pending: unknown = null;
    try {
      const value = localStorage.getItem(`elfkey-pending:${model}`);
      if (value) pending = JSON.parse(value);
    } catch {}
    setModel(model);
    setBaseline(slots);
    setDraft(restorePending(pending, model, slots));
    setSelected(0);
  };
  const acknowledgeSaved = (keyNumber: number, binding: KeyBinding): void =>
    setBaseline((previous) =>
      previous.map((slot) =>
        slot.keyNumber === keyNumber ? { ...slot, binding } : slot,
      ),
    );
  const resize = (count: number): void => {
    setDraft((previous) => {
      const next = emptyDraft(count);
      previous.keys.slice(0, count).forEach((key, i) => (next.keys[i] = key));
      return next;
    });
    setSelected(0);
  };
  const importDraft = (data: unknown, expectedCount?: number): void => {
    const next = validateDraft(data);
    if (expectedCount !== undefined && next.count !== expectedCount)
      throw new Error("연결된 장치의 키 수와 파일의 키 수가 달라요.");
    setDraft(next);
    setSelected(0);
  };
  return {
    draft,
    selected,
    setSelected,
    binding: draft.keys[selected] ?? { code: "", modifiers: [] },
    change,
    readDevice,
    acknowledgeSaved,
    resize,
    importDraft,
  };
}
export type KeymapController = ReturnType<typeof useKeymap>;
