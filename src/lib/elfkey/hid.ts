import type { CollectionInfo, DeviceInfo, ReportInfo } from "./types.js";
export function describeDevice(device: HIDDevice): DeviceInfo {
  const collection = (c: HIDCollectionInfo): CollectionInfo => ({
    usagePage: c.usagePage ?? 0,
    usage: c.usage ?? 0,
    inputReports: reports(c.inputReports),
    outputReports: reports(c.outputReports),
    featureReports: reports(c.featureReports),
    children: (c.children || []).map(collection),
  });
  function reports(list: HIDReportInfo[] = []): ReportInfo[] {
    return list.map((r) => ({
      reportId: r.reportId ?? 0,
      items: (r.items ?? []).map((i) => ({
        reportSize: i.reportSize ?? 0,
        reportCount: i.reportCount ?? 0,
        usages: i.usages ?? [],
        usageMinimum: i.usageMinimum ?? 0,
        usageMaximum: i.usageMaximum ?? 0,
        isArray: i.isArray ?? false,
        isConstant: i.isConstant ?? false,
      })),
    }));
  }
  return {
    productName: device.productName,
    vendorId: device.vendorId,
    productId: device.productId,
    collections: device.collections.map(collection),
  };
}
export function hasVendorCollection(collections: CollectionInfo[]): boolean {
  return collections.some(
    (c) => c.usagePage >= 0xff00 || hasVendorCollection(c.children || []),
  );
}

export function hasConfigurationCollection(
  collections: CollectionInfo[],
): boolean {
  return collections.some(
    (c) =>
      c.usagePage >= 0xff00 ||
      (c.usagePage === 1 && c.usage === 0) ||
      hasConfigurationCollection(c.children),
  );
}
