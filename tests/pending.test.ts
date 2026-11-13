import test from "node:test";
import assert from "node:assert/strict";
import {
  pendingIndices,
  restorePending,
} from "../src/features/keymap/pending-draft";
import { emptyDraft } from "../src/lib/elfkey/draft";
import type { SavedSlot } from "../src/features/keymap/slot";
const slots: SavedSlot[] = [
  { keyNumber: 1, binding: { code: "KeyD", modifiers: [] }, label: "D" },
  { keyNumber: 2, binding: { code: "KeyB", modifiers: [] }, label: "B" },
  { keyNumber: 3, binding: { code: "KeyC", modifiers: [] }, label: "C" },
];
test("left A remains pending when current device data is D B C", () => {
  const draft = emptyDraft(3);
  draft.keys = [
    { code: "KeyA", modifiers: [] },
    { code: "KeyB", modifiers: [] },
    { code: "KeyC", modifiers: [] },
  ];
  assert.deepEqual(pendingIndices(draft, slots), [0]);
});
test("refresh restores only unsaved edits for the same model, retaining fresh device values elsewhere", () => {
  const draft = emptyDraft(3);
  draft.keys[0] = { code: "KeyA", modifiers: [] };
  const stored = {
    schema: "elfkey-pending/v1",
    model: "FS23-P_V5.7",
    draft,
    indices: [0],
  };
  const restored = restorePending(stored, stored.model, slots);
  assert.deepEqual(
    restored.keys.map((k) => k.code),
    ["KeyA", "KeyB", "KeyC"],
  );
  assert.deepEqual(pendingIndices(restored, slots), [0]);
  assert.deepEqual(
    restorePending(stored, "another model", slots).keys.map((k) => k.code),
    ["KeyD", "KeyB", "KeyC"],
  );
});
test("malformed local pending data cannot replace actual device keys", () => {
  assert.deepEqual(
    restorePending(
      { schema: "elfkey-pending/v1", model: "m", indices: [0], draft: null },
      "m",
      slots,
    ).keys.map((k) => k.code),
    ["KeyD", "KeyB", "KeyC"],
  );
});
