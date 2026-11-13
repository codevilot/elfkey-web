import type { ModelProfile } from "./types.js";
import { modelPatterns } from "./model-patterns.js";
export const VENDORS = [6790, 3141, 16701, 9354, 13651];
export const PRODUCTS = [
  57382, 57387, 57388, 57389, 29699, 29700, 29701, 40966, 40967, 57520, 45057,
  49153, 49155, 49161, 49168, 45058, 45059, 49156, 45571, 49424, 49425, 49441,
  49456, 49169, 49159, 49408, 49445, 57381, 49472, 49473, 49474, 49730, 8455,
  40961, 56865,
];
export function isElfKey(vendorId: number, productId: number): boolean {
  return VENDORS.includes(vendorId) && PRODUCTS.includes(productId);
}
export function expectedReportId(vendorId: number, productId: number): 0 | 1 {
  return (vendorId === 6790 && productId === 57520) ||
    (vendorId === 13651 &&
      ![49155, 49168, 49424, 49169, 49473, 49730].includes(productId))
    ? 1
    : 0;
}
const range = (n: number, start = 1): number[] =>
  Array.from({ length: n }, (_, i) => i + start);
export function resolveModel(
  model: string,
  vendorId: number,
  productId: number,
): ModelProfile {
  if (!isElfKey(vendorId, productId))
    throw new Error("ElfKey 설치 파일의 장치 ID 목록에 없는 장치입니다.");
  if (!/^[A-Za-z][\x20-\x7e]*\d+\.\d+$/.test(model))
    throw new Error("모델 응답 형식을 확인하지 못했습니다.");
  const has = (...tokens: string[]): boolean =>
    tokens.some((t) => model.includes(t));
  const family = (name: string): boolean =>
    (modelPatterns[name] ?? []).some((t) => model.includes(t));
  const version = Number(model.match(/(\d+\.\d+)$/)?.[1]);
  let keys: number[] = [];
  if (family("isOneKey") && !has("FS22X5", "FS2019USB2C")) {
    keys = [2];
    if (has("FS2017BT2", "FS2017U2SW")) keys.unshift(1);
    if (has("PT23U")) keys = [1, 17, 33, 49];
  } else if (family("isTwoKey")) {
    keys = [1, 2];
    if (has("PT23A")) keys.push(17, 18, 33, 34, 49, 50);
  } else if (family("isThreeKey")) {
    keys = range(3);
    if (
      (has("MK321U_", "MK321UR_", "MK321UA_") && version >= 1.3) ||
      (has("MK321-Pro", "MK321Pro", "MK321BT_", "MK321G") && version >= 1.6)
    )
      keys.push(...range(3, 17), ...range(3, 33));
    else if (has("FS2020BT2", "FS2020U2SW")) keys.push(4, 5, 6);
    else if (has("MK321BT-Way"))
      keys.push(...range(3, 4), ...range(6, 17), ...range(6, 33));
  } else if (family("isFourKey")) {
    keys = range(4);
    if (has("MK424")) keys.push(...range(4, 17), ...range(4, 33));
  } else if (family("isFiveKey")) keys = range(5);
  else if (family("isSixKey")) {
    keys = range(6);
    if (has("MK623")) keys.push(...range(6, 17), ...range(6, 33));
  } else if (family("isEightKey"))
    keys = [...range(8), ...range(8, 17), ...range(8, 33)];
  else if (family("isTwelveKey"))
    keys = [...range(12), ...range(12, 17), ...range(12, 33)];
  else if (family("isFourteenKey")) keys = range(14);
  else if (has("DIY100KEY")) keys = range(100);
  else if (has("BTC24K04")) keys = range(4);
  else if (has("BTC24K56")) keys = range(56);
  else if (has("AnyKey"))
    keys = range(version >= 1.3 ? 130 : 128, 0).map((i) =>
      i < 17
        ? i + 1
        : i < 22
          ? i + 4
          : i < 30
            ? i + 9
            : i < 128
              ? i + 11
              : i - 110,
    );
  if (keys.length === 0 || has("RD_Dongle", "Delta21"))
    throw new Error(
      `이 모델의 키 저장 경로는 아직 지원되지 않습니다: ${model}`,
    );
  const needFlash =
    vendorId === 3141 &&
    (productId === 29701 ||
      (productId === 29699 && has("DIY-KeyBoardF1.0")) ||
      (productId === 29700 && has("USB5Key_F")));
  return {
    model,
    keyNumbers: keys,
    needFlash,
    reportId: expectedReportId(vendorId, productId),
  };
}
