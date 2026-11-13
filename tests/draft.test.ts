import test from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, validateDraft, bindingLabel } from "../src/lib/elfkey/draft.js";
import { hasVendorCollection } from "../src/lib/elfkey/hid.js";
test("export/import roundtrip preserves combinations without sharing key arrays", () => {
  const d = emptyDraft(3);
  d.keys[1] = { code: "KeyC", modifiers: ["Control", "Shift"] };
  const copy = validateDraft(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(copy, d);
  assert.equal(bindingLabel(copy.keys[1]), "Ctrl + Shift + C");
  copy.keys[1]!.modifiers.push("Alt");
  assert.equal(d.keys[1]!.modifiers.length, 2);
  assert.equal(d.keys[0]!.modifiers.length, 0);
});
test("rejects malformed, unsupported and oversized key data", () => {
  for (const value of [
    null,
    {},
    { ...emptyDraft(), count: 999 },
    { ...emptyDraft(), keys: [] },
    {
      ...emptyDraft(3),
      keys: [
        { code: "Power", modifiers: [] },
        { code: "", modifiers: [] },
        { code: "", modifiers: [] },
      ],
    },
  ])
    assert.throws(() => validateDraft(value));
  const d = emptyDraft(3);
  d.keys[0]!.modifiers = ["Control", "Control"];
  assert.throws(() => validateDraft(d));
});
test("inspector finds nested vendor collections", () => {
  assert.equal(
    hasVendorCollection([
      {
        usagePage: 1,
        usage: 6,
        inputReports: [],
        outputReports: [],
        featureReports: [],
        children: [
          {
            usagePage: 65280,
            usage: 1,
            inputReports: [],
            outputReports: [],
            featureReports: [],
            children: [],
          },
        ],
      },
    ]),
    true,
  );
  assert.equal(hasVendorCollection([]), false);
});
