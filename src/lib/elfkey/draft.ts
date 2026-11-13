import type { Draft, KeyBinding, Modifier } from "./types.js";
export const COUNTS = [3, 6, 9, 12, 24];
export const KEYS: readonly (readonly [string, string])[] = [
  ...Array.from(
    { length: 26 },
    (_, i) =>
      [
        String.fromCharCode(65 + i),
        `Key${String.fromCharCode(65 + i)}`,
      ] as const,
  ),
  ...Array.from({ length: 10 }, (_, i) => [String(i), `Digit${i}`] as const),
  ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`] as const),
  ...[
    "Enter",
    "Space",
    "Tab",
    "Backspace",
    "Delete",
    "Escape",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Insert",
    "CapsLock",
    "PrintScreen",
    "ScrollLock",
    "Pause",
  ].map((k) => [k, k] as const),
  ...([
    ["-", "Minus"],
    ["=", "Equal"],
    ["[", "BracketLeft"],
    ["]", "BracketRight"],
    [";", "Semicolon"],
    ["'", "Quote"],
    [",", "Comma"],
    [".", "Period"],
    ["/", "Slash"],
    ["\\", "Backslash"],
    ["`", "Backquote"],
  ] as const),
];
export const MODIFIERS: readonly Modifier[] = [
  "Control",
  "Shift",
  "Alt",
  "Meta",
];
export function emptyDraft(count = 12): Draft {
  return {
    schema: "elfkey-web-draft/v1",
    count,
    keys: Array.from({ length: count }, () => ({ code: "", modifiers: [] })),
  };
}
export function validateDraft(value: unknown): Draft {
  if (!value || typeof value !== "object")
    throw new Error("올바른 초안 파일이 아닙니다.");
  const candidate = value as Partial<Draft>;
  if (
    candidate.schema !== "elfkey-web-draft/v1" ||
    !Number.isInteger(candidate.count) ||
    !candidate.count ||
    candidate.count < 1 ||
    candidate.count > 256 ||
    !Array.isArray(candidate.keys) ||
    candidate.keys.length !== candidate.count
  )
    throw new Error("올바른 ElfKey 초안 파일이 아닙니다.");
  const codes = new Set(["", ...KEYS.map((x) => x[1])]);
  for (const key of candidate.keys)
    if (
      !key ||
      !codes.has(key.code) ||
      !Array.isArray(key.modifiers) ||
      key.modifiers.length > 4 ||
      new Set(key.modifiers).size !== key.modifiers.length ||
      key.modifiers.some((m) => !MODIFIERS.includes(m))
    )
      throw new Error("지원하지 않는 키 설정이 있습니다.");
  return {
    schema: candidate.schema,
    count: candidate.count,
    keys: candidate.keys.map((k) => ({
      code: k.code,
      modifiers: [...k.modifiers],
    })),
  };
}
export function bindingLabel(key: KeyBinding | undefined) {
  if (!key?.code) return "미지정";
  return [
    ...key.modifiers.map((m) =>
      m === "Control" ? "Ctrl" : m === "Meta" ? "Win/⌘" : m,
    ),
    KEYS.find((x) => x[1] === key.code)?.[0] || key.code,
  ].join(" + ");
}
