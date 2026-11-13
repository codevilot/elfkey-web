import test from "node:test";
import assert from "node:assert/strict";
import { WebHidTransport } from "../src/lib/elfkey/transport.js";
class FakeHid extends EventTarget {
  opened = true;
  writes: { id: number; data: number[] }[] = [];
  collections: HIDCollectionInfo[];
  constructor(id: number) {
    super();
    this.collections = [
      {
        usagePage: 65280,
        usage: 1,
        inputReports: [
          { reportId: id, items: [{ reportSize: 8, reportCount: 8 }] },
        ],
        outputReports: [
          { reportId: id, items: [{ reportSize: 8, reportCount: 8 }] },
        ],
      },
    ];
  }
  async sendReport(id: number, data: Uint8Array): Promise<void> {
    this.writes.push({ id, data: [...data] });
  }
  emit(id: number, bytes: number[]): void {
    const event = new Event("inputreport");
    Object.defineProperties(event, {
      reportId: { value: id },
      data: { value: new DataView(new Uint8Array(bytes).buffer) },
    });
    this.dispatchEvent(event);
  }
  asDevice(): HIDDevice {
    return this as unknown as HIDDevice;
  }
}
test("report ID is separate from the exact eight payload bytes", async () => {
  for (const id of [0, 1] as const) {
    const d = new FakeHid(id);
    const t = new WebHidTransport(d.asDevice(), id);
    const p = new Uint8Array([1, 131, 8, 0, 0, 0, 0, 0]);
    await t.send(p);
    assert.deepEqual(d.writes, [{ id, data: [...p] }]);
    d.emit(id, [8, 129, 1, 4, 0, 0, 0, 0]);
    assert.deepEqual([...(await t.next())], [8, 129, 1, 4, 0, 0, 0, 0]);
    t.dispose();
  }
});
test("unrelated reports are ignored and response wait times out", async () => {
  const d = new FakeHid(1),
    t = new WebHidTransport(d.asDevice(), 1);
  d.emit(0, [8, 129, 1, 4, 0, 0, 0, 0]);
  await assert.rejects(t.next(5), /초과/);
  t.dispose();
});
test("physical disconnect cancels an outstanding response wait", async () => {
  const d = new FakeHid(0),
    t = new WebHidTransport(d.asDevice(), 0);
  const p = t.next();
  t.dispose();
  await assert.rejects(p, /해제/);
  await assert.rejects(t.send(new Uint8Array(8)), /해제/);
});
test("protected keyboard collections and wrong report lengths cannot enable writes", () => {
  const d = new FakeHid(0);
  d.collections[0]!.usagePage = 1;
  assert.throws(() => new WebHidTransport(d.asDevice(), 0), /일치/);
  d.collections[0]!.usagePage = 65280;
  d.collections[0]!.outputReports![0]!.items![0]!.reportCount = 64;
  assert.throws(() => new WebHidTransport(d.asDevice(), 0), /일치/);
});
test("receiver 64-byte inputs preserve the full payload with 8-byte output descriptors", async () => {
  const d = new FakeHid(1);
  d.collections[0]!.inputReports![0]!.items![0]!.reportCount = 64;
  const t = new WebHidTransport(d.asDevice(), 1);
  const bytes = Array.from({ length: 64 }, (_, i) => i);
  d.emit(1, bytes);
  assert.deepEqual([...(await t.next())], bytes);
  t.dispose();
});

test("real 3553:B001 FootSwitch configuration descriptor chooses unnumbered report 0", async () => {
  const { configurationReportId, configurationFilters } =
    await import("../src/lib/elfkey/report-selection.js");
  const d = new FakeHid(0);
  d.collections[0]!.usagePage = 1;
  d.collections[0]!.usage = 0;
  const actual = Object.assign(d, { vendorId: 13651, productId: 45057 });
  assert.equal(configurationReportId(actual.asDevice()), 0);
  const t = new WebHidTransport(
    actual.asDevice(),
    configurationReportId(actual.asDevice()),
  );
  await t.send(new Uint8Array([1, 131, 8, 0, 0, 0, 0, 0]));
  assert.equal(actual.writes[0]?.id, 0);
  t.dispose();
  assert.ok(
    configurationFilters().some(
      (f) => f.vendorId === 13651 && f.usagePage === 1 && f.usage === 0,
    ),
  );
  d.collections[0]!.usage = 6;
  assert.throws(
    () => configurationReportId(actual.asDevice()),
    /설정용 인터페이스/,
  );
});

test("chooser returning multiple interfaces picks configuration instead of the first keyboard interface", async () => {
  const { configurationDevice } = await import("../src/lib/elfkey/report-selection.js");
  const keyboard = new FakeHid(1);
  keyboard.collections[0]!.usagePage = 1;
  keyboard.collections[0]!.usage = 6;
  const config = new FakeHid(0);
  config.collections[0]!.usagePage = 1;
  config.collections[0]!.usage = 0;
  assert.equal(
    configurationDevice([keyboard.asDevice(), config.asDevice()]),
    config.asDevice(),
  );
  assert.equal(configurationDevice([keyboard.asDevice()]), undefined);
});
