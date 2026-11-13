import { VENDORS, expectedReportId } from "./models.js";
function configurationCollection(c: HIDCollectionInfo): boolean {
  return (c.usagePage ?? 0) >= 0xff00 || (c.usagePage === 1 && c.usage === 0);
}
export function configurationFilters(): HIDDeviceFilter[] {
  return VENDORS.flatMap((vendorId) => [
    { vendorId, usagePage: 1, usage: 0 },
    { vendorId, usagePage: 65280 },
  ]);
}
export function configurationReportId(device: HIDDevice): 0 | 1 {
  const flatten = (list: HIDCollectionInfo[]): HIDCollectionInfo[] =>
    list.flatMap((c) => [c, ...flatten(c.children ?? [])]);
  const collections = flatten(
    device.collections.filter(configurationCollection),
  );
  const byteLength = (report: HIDReportInfo): number =>
    (report.items ?? []).reduce(
      (bits, item) => bits + (item.reportSize ?? 0) * (item.reportCount ?? 0),
      0,
    ) / 8;
  const outputIds = collections.flatMap((c) =>
    (c.outputReports ?? [])
      .filter((r) => byteLength(r) === 8)
      .map((r) => r.reportId ?? 0),
  );
  const inputIds = collections.flatMap((c) =>
    (c.inputReports ?? [])
      .filter((r) => [8, 64].includes(byteLength(r)))
      .map((r) => r.reportId ?? 0),
  );
  const candidates = Array.from(
    new Set(
      outputIds.filter((id) => (id === 0 || id === 1) && inputIds.includes(id)),
    ),
  );
  const preferred = expectedReportId(device.vendorId, device.productId);
  if (candidates.includes(preferred)) return preferred;
  if (candidates.length === 1 && (candidates[0] === 0 || candidates[0] === 1))
    return candidates[0];
  throw new Error(
    candidates.length
      ? "설정용 보고서가 여러 개라 통신 경로를 확정할 수 없습니다."
      : "설정용 인터페이스가 아닙니다. 연결 해제 후 USB 장치 연결을 눌러 설정용 FootSwitch를 선택하세요.",
  );
}

export function configurationDevice(
  devices: HIDDevice[],
): HIDDevice | undefined {
  for (const device of devices) {
    try {
      configurationReportId(device);
      return device;
    } catch {
      /* Try the next interface of the selected physical device. */
    }
  }
  return undefined;
}
