export type Modifier = "Control" | "Shift" | "Alt" | "Meta";
export interface KeyBinding {
  code: string;
  modifiers: Modifier[];
}
export interface Draft {
  schema: "elfkey-web-draft/v1";
  count: number;
  keys: KeyBinding[];
}
export interface LogEntry {
  time: string;
  message: string;
}
export interface ReportItem {
  reportSize: number;
  reportCount: number;
  usages: number[];
  usageMinimum: number;
  usageMaximum: number;
  isArray: boolean;
  isConstant: boolean;
}
export interface ReportInfo {
  reportId: number;
  items: ReportItem[];
}
export interface CollectionInfo {
  usagePage: number;
  usage: number;
  inputReports: ReportInfo[];
  outputReports: ReportInfo[];
  featureReports: ReportInfo[];
  children: CollectionInfo[];
}
export interface DeviceInfo {
  productName: string;
  vendorId: number;
  productId: number;
  collections: CollectionInfo[];
}
export interface ModelProfile {
  model: string;
  keyNumbers: number[];
  needFlash: boolean;
  reportId: 0 | 1;
  is24?: boolean;
  dongleModel?: string;
}
export interface Transport {
  beginSession?(): Promise<void>;
  endSession?(): Promise<void>;
  send(packet: Uint8Array): Promise<void>;
  next(timeoutMs?: number): Promise<Uint8Array>;
  clear(): void;
  dispose(): void;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
