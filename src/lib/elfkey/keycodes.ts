import type { KeyBinding, Modifier } from "./types.js";
const SPECIAL: Readonly<Record<string, number>> = {
  Enter: 40,
  Escape: 41,
  Backspace: 42,
  Tab: 43,
  Space: 44,
  Minus: 45,
  Equal: 46,
  BracketLeft: 47,
  BracketRight: 48,
  Backslash: 49,
  Semicolon: 51,
  Quote: 52,
  Backquote: 53,
  Comma: 54,
  Period: 55,
  Slash: 56,
  CapsLock: 57,
  PrintScreen: 70,
  ScrollLock: 71,
  Pause: 72,
  Insert: 73,
  Home: 74,
  PageUp: 75,
  Delete: 76,
  End: 77,
  PageDown: 78,
  ArrowRight: 79,
  ArrowLeft: 80,
  ArrowDown: 81,
  ArrowUp: 82,
};
const BITS: Readonly<Record<Modifier, number>> = {
  Control: 1,
  Shift: 2,
  Alt: 4,
  Meta: 8,
};
export function usageCode(code: string): number {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3) - 61;
  if (/^Digit[0-9]$/.test(code))
    return code === "Digit0" ? 39 : 29 + Number(code.slice(5));
  if (/^F([1-9]|1[0-2])$/.test(code)) return 57 + Number(code.slice(1));
  if (code === "") return 0;
  const result = SPECIAL[code];
  if (result === undefined) throw new Error(`지원하지 않는 키: ${code}`);
  return result;
}
export function keyPayload(binding: KeyBinding): Uint8Array<ArrayBuffer> {
  const mask = binding.modifiers.reduce((bits, m) => bits | BITS[m], 0);
  return new Uint8Array([8, 129, mask, usageCode(binding.code), 0, 0, 0, 0]);
}
export function writeHeader(
  keyNumber: number,
  length: number,
): Uint8Array<ArrayBuffer> {
  if (
    !Number.isInteger(keyNumber) ||
    keyNumber < 1 ||
    keyNumber > 255 ||
    length < 1 ||
    length > 255
  )
    throw new Error("잘못된 키 번호 또는 데이터 길이입니다.");
  return new Uint8Array([1, 129, length, keyNumber, 0, 0, 0, 0]);
}
