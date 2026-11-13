import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ElfKeyProtocol } from "../src/lib/elfkey/protocol.js";
import { resolveModel, expectedReportId } from "../src/lib/elfkey/models.js";
import { keyPayload, usageCode } from "../src/lib/elfkey/keycodes.js";
import type { ModelProfile, Transport } from "../src/lib/elfkey/types.js";
const profile: ModelProfile = {
  model: "MK321_1.0",
  keyNumbers: [1, 2, 3],
  needFlash: false,
  reportId: 0,
};
class FakeTransport implements Transport {
  queue: Uint8Array[] = [];
  sent: number[][] = [];
  bank = new Map<number, Uint8Array[]>(
    [1, 2, 3].map((n) => [n, [new Uint8Array([8, 129, 0, 3 + n, 0, 0, 0, 0])]]),
  );
  header: { key: number; remaining: number } | null = null;
  corrupt = false;
  failRead = false;
  async send(p: Uint8Array): Promise<void> {
    this.sent.push([...p]);
    if (this.header) {
      const h = this.header;
      const rows = this.bank.get(h.key) ?? [];
      rows.push(p.slice());
      this.bank.set(h.key, rows);
      if (--h.remaining === 0) this.header = null;
      return;
    }
    if (p[0] === 1 && p[1] === 131) {
      const bytes = new TextEncoder().encode("MK321_1.0");
      for (let i = 0; i < bytes.length; i += 8) {
        const chunk = new Uint8Array(8);
        chunk.set(bytes.slice(i, i + 8));
        this.queue.push(chunk);
      }
      return;
    }
    if (p[0] === 1 && p[1] === 130) {
      if (this.failRead) throw new Error("read failed");
      const rows = this.bank.get(p[3]!)!;
      this.queue.push(...rows.map((r) => r.slice()));
      if (this.corrupt && this.sent.some((r) => r[0] === 1 && r[1] === 129))
        this.queue[0]![3] = 99;
      return;
    }
    if (p[0] === 1 && p[1] === 129) {
      this.header = { key: p[3]!, remaining: Math.ceil(p[2]! / 8) };
      this.bank.set(p[3]!, []);
      return;
    }
    if (p[0] === 1 && p[1] === 128) {
      this.bank.clear();
      this.queue.push(new Uint8Array([129, 85, 0, 0, 0, 0, 0, 0]));
      return;
    }
    throw new Error("Unexpected packet");
  }
  async next(): Promise<Uint8Array> {
    const p = this.queue.shift();
    if (!p) throw new Error("timeout");
    return p;
  }
  clear(): void {
    this.queue = [];
  }
  dispose(): void {
    this.clear();
  }
}
test("model slot mappings agree with 280 original ElfKey init outputs", () => {
  const fixtures = JSON.parse(
    fs.readFileSync(new URL("./fixtures/models.json", import.meta.url), "utf8"),
  ) as { model: string; keyNumbers: number[] }[];
  assert.equal(fixtures.length, 280);
  for (const row of fixtures)
    assert.deepEqual(
      resolveModel(row.model, 13651, 45057).keyNumbers,
      row.keyNumbers,
      row.model,
    );
});
test("model query resolves actual ASCII packet chunks and report IDs", async () => {
  const t = new FakeTransport();
  const p = await ElfKeyProtocol.identify(t, 13651, 45057);
  assert.deepEqual(p.profile.keyNumbers, [1, 2, 3]);
  assert.equal(expectedReportId(13651, 45057), 1);
  assert.equal(expectedReportId(13651, 49155), 0);
  assert.equal(expectedReportId(6790, 57520), 1);
  assert.throws(() => resolveModel("random_1.0", 1, 1));
});
test("Ctrl+Shift+C bytes match original recovered saveKeyboard output", async () => {
  // Original 3.4.1 saveKeyboard oracle: header [1,129,8,2,0,0,0,0], payload [8,129,3,6,0,0,0,0].
  const t = new FakeTransport();
  const p = new ElfKeyProtocol(t, profile);
  let backedUp = false;
  const result = await p.saveKey(
    2,
    { code: "KeyC", modifiers: ["Control", "Shift"] },
    (backup) => {
      assert.equal(t.sent.length, 1);
      assert.equal(backup[0]?.packets[0]?.[3], 5);
      backedUp = true;
    },
  );
  assert.equal(result.verified, true);
  assert.equal(backedUp, true);
  assert.deepEqual(t.sent, [
    [1, 130, 8, 2, 0, 0, 0, 0],
    [1, 129, 8, 2, 0, 0, 0, 0],
    [8, 129, 3, 6, 0, 0, 0, 0],
    [1, 130, 8, 2, 0, 0, 0, 0],
  ]);
  assert.equal(t.bank.get(1)?.[0]?.[3], 4);
  assert.equal(t.bank.get(3)?.[0]?.[3], 6);
});
test("readback mismatch is a failure, never a successful save", async () => {
  const t = new FakeTransport();
  t.corrupt = true;
  await assert.rejects(
    new ElfKeyProtocol(t, profile).saveKey(2, { code: "KeyA", modifiers: [] }),
    /검증 실패/,
  );
});
test("backup failure prevents writes and whole-bank erase", async () => {
  const t = new FakeTransport();
  t.failRead = true;
  await assert.rejects(
    new ElfKeyProtocol(t, { ...profile, needFlash: true }).saveKey(2, {
      code: "KeyA",
      modifiers: [],
    }),
  );
  assert.equal(
    t.sent.some((p) => p[1] === 128 || p[1] === 129),
    false,
  );
});
test("legacy flash restores untouched multi-packet keys and verifies the entire bank", async () => {
  const t = new FakeTransport();
  const long = [
    new Uint8Array([16, 4, 65, 66, 67, 68, 69, 70]),
    new Uint8Array([71, 72, 73, 74, 75, 76, 77, 78]),
  ];
  t.bank.set(1, long);
  const before = t.bank.get(3)?.map((p) => [...p]);
  let backupBeforeErase = false;
  const result = await new ElfKeyProtocol(t, {
    ...profile,
    needFlash: true,
  }).saveKey(2, { code: "KeyZ", modifiers: ["Meta"] }, (backup) => {
    assert.equal(backup.length, 3);
    assert.equal(t.sent.length, 3);
    backupBeforeErase = true;
  });
  assert.equal(result.verified, true);
  assert.equal(backupBeforeErase, true);
  assert.deepEqual(t.bank.get(1), long);
  assert.deepEqual(
    t.bank.get(3)?.map((p) => [...p]),
    before,
  );
  assert.equal(t.bank.get(2)?.[0]?.[3], 29);
});
test("unsupported keys and slots are rejected before USB writes", async () => {
  const t = new FakeTransport();
  const p = new ElfKeyProtocol(t, profile);
  await assert.rejects(p.saveKey(99, { code: "KeyA", modifiers: [] }));
  await assert.rejects(p.saveKey(2, { code: "Power", modifiers: [] }));
  assert.equal(t.sent.length, 0);
  assert.equal(usageCode("Digit0"), 39);
  assert.equal(usageCode("F12"), 69);
  assert.deepEqual(
    [...keyPayload({ code: "", modifiers: [] })],
    [8, 129, 0, 0, 0, 0, 0, 0],
  );
});
class WirelessTransport extends FakeTransport {
  failWireless = false;
  override async send(p: Uint8Array): Promise<void> {
    if (p[0] === 1 && p[1] === 131) {
      this.sent.push([...p]);
      const bytes = new TextEncoder().encode("RD_Dongle_1.0");
      for (let i = 0; i < bytes.length; i += 8) {
        const chunk = new Uint8Array(8);
        chunk.set(bytes.slice(i, i + 8));
        this.queue.push(chunk);
      }
      return;
    }
    if (p[0] === 1 && p[1] === 2) {
      this.sent.push([...p]);
      const reply = new Uint8Array(64);
      reply.set(new TextEncoder().encode("MK321_1.6"), 1);
      this.queue.push(reply);
      return;
    }
    await super.send(p);
    if (p[0] === 1 && p[1] === 130) {
      const rows = this.queue.splice(0);
      const wide = new Uint8Array(64);
      rows.forEach((row, i) => wide.set(row, i * 8));
      if (this.failWireless) {
        wide[0] = 203;
        wide[1] = 2;
      }
      this.queue.push(wide);
    }
  }
}
test("2.4 GHz receiver identifies its peripheral and verifies a 64-byte read response", async () => {
  const t = new WirelessTransport();
  const p = await ElfKeyProtocol.identify(t, 13651, 45057);
  assert.equal(p.profile.is24, true);
  assert.equal(p.profile.dongleModel, "RD_Dongle_1.0");
  assert.equal(p.profile.model, "MK321_1.6");
  const result = await p.saveKey(2, { code: "KeyC", modifiers: ["Control"] });
  assert.equal(result.verified, true);
  assert.equal(t.bank.get(2)?.[0]?.[2], 1);
});
test("wireless failure status prevents writes", async () => {
  const t = new WirelessTransport();
  const p = await ElfKeyProtocol.identify(t, 13651, 45057);
  t.failWireless = true;
  await assert.rejects(
    p.saveKey(2, { code: "KeyC", modifiers: [] }),
    /무선 장치/,
  );
  assert.equal(
    t.sent.some((row) => row[1] === 129),
    false,
  );
});

test("save sessions are released after success and failure and can reopen for the next save", async () => {
  class SessionTransport extends FakeTransport {
    opened = false;
    opens = 0;
    closes = 0;
    async beginSession(): Promise<void> {
      this.opened = true;
      this.opens++;
    }
    async endSession(): Promise<void> {
      this.opened = false;
      this.closes++;
    }
  }
  const t = new SessionTransport(),
    p = new ElfKeyProtocol(t, profile);
  await p.saveKey(1, { code: "KeyA", modifiers: [] });
  assert.equal(t.opened, false);
  await p.saveKey(1, { code: "KeyB", modifiers: [] });
  assert.equal(t.opens, 2);
  assert.equal(t.closes, 2);
  t.failRead = true;
  await assert.rejects(p.saveKey(1, { code: "KeyC", modifiers: [] }));
  assert.equal(t.opened, false);
  assert.equal(t.closes, 3);
});
