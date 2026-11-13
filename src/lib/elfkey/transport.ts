import type { Transport } from "./types.js";
interface Pending {
  resolve: (packet: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
export class WebHidTransport implements Transport {
  private queue: Uint8Array[] = [];
  private pending: Pending | null = null;
  private disposed = false;
  private readonly input = (event: HIDInputReportEvent): void => {
    if (
      event.reportId !== this.reportId ||
      ![8, 64].includes(event.data.byteLength)
    )
      return;
    const packet = new Uint8Array(
      event.data.buffer,
      event.data.byteOffset,
      event.data.byteLength,
    ).slice();
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      pending.resolve(packet);
    } else {
      this.queue.push(packet);
      if (this.queue.length > 64) this.queue.shift();
    }
  };
  constructor(
    private readonly device: HIDDevice,
    private readonly reportId: 0 | 1,
  ) {
    const vendor = device.collections.filter(
      (c) =>
        (c.usagePage ?? 0) >= 0xff00 || (c.usagePage === 1 && c.usage === 0),
    );
    const flatten = (collections: HIDCollectionInfo[]): HIDCollectionInfo[] =>
      collections.flatMap((c) => [c, ...flatten(c.children ?? [])]);
    const collections = flatten(vendor);
    const matches = (r: HIDReportInfo, bytes: readonly number[]): boolean =>
      (r.reportId ?? 0) === reportId &&
      bytes.includes(
        (r.items ?? []).reduce(
          (bits, i) => bits + (i.reportSize ?? 0) * (i.reportCount ?? 0),
          0,
        ) / 8,
      );
    if (
      !collections.some((c) =>
        (c.outputReports ?? []).some((r) => matches(r, [8])),
      ) ||
      !collections.some((c) =>
        (c.inputReports ?? []).some((r) => matches(r, [8, 64])),
      )
    )
      throw new Error(
        "설정용 HID 보고서(출력 8바이트, 입력 8/64바이트)가 일치하지 않습니다. 진단 정보를 확인하세요.",
      );
    device.addEventListener("inputreport", this.input);
  }
  async beginSession(): Promise<void> {
    if (this.disposed) throw new Error("USB 연결이 해제되었습니다.");
    if (!this.device.opened) await this.device.open();
    this.clear();
  }
  async endSession(): Promise<void> {
    this.clear();
    if (this.device.opened) await this.device.close();
  }
  async send(packet: Uint8Array): Promise<void> {
    if (this.disposed || !this.device.opened)
      throw new Error("USB 연결이 해제되었습니다.");
    if (packet.length !== 8) throw new Error("설정 패킷은 8바이트여야 합니다.");
    await this.device.sendReport(this.reportId, new Uint8Array(packet));
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
  }
  next(timeoutMs = 1500): Promise<Uint8Array> {
    if (this.disposed)
      return Promise.reject(new Error("USB 연결이 해제되었습니다."));
    const packet = this.queue.shift();
    if (packet) return Promise.resolve(packet);
    if (this.pending)
      return Promise.reject(new Error("동시에 두 응답을 기다릴 수 없습니다."));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new Error("장치 응답 시간이 초과되었습니다."));
      }, timeoutMs);
      this.pending = { resolve, reject, timer };
    });
  }
  clear(): void {
    this.queue = [];
  }
  dispose(): void {
    this.disposed = true;
    this.device.removeEventListener("inputreport", this.input);
    this.queue = [];
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error("USB 연결이 해제되었습니다."));
      this.pending = null;
    }
  }
}
