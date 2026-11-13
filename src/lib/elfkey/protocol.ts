import type { KeyBinding, ModelProfile, Transport } from "./types.js";
import { keyPayload, writeHeader } from "./keycodes.js";
import { resolveModel } from "./models.js";
export interface RawKey {
  keyNumber: number;
  length: number;
  packets: Uint8Array[];
}
export interface SaveResult {
  keyNumber: number;
  verified: true;
  backup: RawKey[];
}
export class ElfKeyProtocol {
  private busy = false;
  constructor(
    private readonly transport: Transport,
    readonly profile: ModelProfile,
  ) {}
  static async identify(
    transport: Transport,
    vendorId: number,
    productId: number,
  ): Promise<ElfKeyProtocol> {
    try {
      await transport.beginSession?.();
      transport.clear();
      await transport.send(new Uint8Array([1, 131, 8, 0, 0, 0, 0, 0]));
      let model = "";
      for (let i = 0; i < 4; i++) {
        const packet = await transport.next();
        if (packet.some((b) => b > 131))
          throw new Error("장치가 올바른 모델 문자열을 반환하지 않았습니다.");
        model += String.fromCharCode(...packet.filter((b) => b !== 0));
        if (/\d+\.\d+$/.test(model.trim())) {
          if (/RD_Dongle|Delta21/.test(model))
            return ElfKeyProtocol.identifyWireless(
              transport,
              model.trim(),
              vendorId,
              productId,
            );
          return new ElfKeyProtocol(
            transport,
            resolveModel(model.trim(), vendorId, productId),
          );
        }
      }
      throw new Error("모델명과 펌웨어 버전을 읽지 못했습니다.");
    } finally {
      await transport.endSession?.();
    }
  }
  private static async identifyWireless(
    transport: Transport,
    dongleModel: string,
    vendorId: number,
    productId: number,
  ): Promise<ElfKeyProtocol> {
    transport.clear();
    await transport.send(new Uint8Array([1, 2, 0, 0, 0, 0, 0, 0]));
    let model = "";
    for (let i = 0; i < 4; i++) {
      const raw = await transport.next(3000);
      const packet = i === 0 ? raw.slice(1) : raw;
      if (packet.some((b) => b > 131))
        throw new Error("수신기에 연결된 장치 모델 응답이 올바르지 않습니다.");
      model += String.fromCharCode(...packet.filter((b) => b !== 0));
      if (/\d+\.\d+$/.test(model.trim()))
        return new ElfKeyProtocol(transport, {
          ...resolveModel(model.trim(), vendorId, productId),
          needFlash: false,
          is24: true,
          dongleModel,
        });
    }
    throw new Error("수신기에 연결된 무선 장치의 모델을 확인하지 못했습니다.");
  }
  private async send(packet: Uint8Array): Promise<void> {
    await this.transport.send(packet);
    if (this.profile.is24)
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }
  private async dataPacket(): Promise<Uint8Array> {
    for (let i = 0; i < 8; i++) {
      const packet = await this.transport.next(this.profile.is24 ? 3000 : 1500);
      if (packet[0] === 203 && packet[1] === 2)
        throw new Error(
          "무선 장치가 응답하지 않습니다. 연결 상태를 확인하세요.",
        );
      if (packet[0] === 129 && packet[1] === 85) continue;
      return packet;
    }
    throw new Error("설정 읽기 응답을 받지 못했습니다.");
  }
  private async readRaw(keyNumber: number): Promise<RawKey> {
    this.transport.clear();
    await this.send(new Uint8Array([1, 130, 8, keyNumber, 0, 0, 0, 0]));
    const first = await this.dataPacket();
    const length = first[0] ?? 0;
    if (length < 1 || length > 255)
      throw new Error(`키 ${keyNumber}의 설정 길이가 잘못되었습니다.`);
    const packets: Uint8Array[] = [];
    const append = (response: Uint8Array): void => {
      for (
        let offset = 0;
        offset < response.length && packets.length < Math.ceil(length / 8);
        offset += 8
      ) {
        const packet = response.slice(offset, offset + 8);
        if (packet.length !== 8) throw new Error("불완전한 설정 응답입니다.");
        packets.push(packet);
      }
    };
    append(first);
    while (packets.length < Math.ceil(length / 8))
      append(await this.dataPacket());
    return { keyNumber, length, packets };
  }
  private async writeRaw(raw: RawKey): Promise<void> {
    await this.send(writeHeader(raw.keyNumber, raw.length));
    for (const packet of raw.packets) await this.send(packet);
  }
  async readKeys(): Promise<RawKey[]> {
    if (this.busy) throw new Error("다른 장치 작업이 진행 중입니다.");
    this.busy = true;
    try {
      await this.transport.beginSession?.();
      const result: RawKey[] = [];
      for (const key of this.profile.keyNumbers)
        result.push(await this.readRaw(key));
      return result;
    } finally {
      try {
        await this.transport.endSession?.();
      } finally {
        this.busy = false;
      }
    }
  }
  async saveKey(
    keyNumber: number,
    binding: KeyBinding,
    onBackup?: (backup: RawKey[]) => void,
  ): Promise<SaveResult> {
    if (this.busy) throw new Error("저장 작업이 이미 진행 중입니다.");
    if (!this.profile.keyNumbers.includes(keyNumber))
      throw new Error("이 모델에 없는 키 번호입니다.");
    const payload = keyPayload(binding); // Validate before any IO.
    this.busy = true;
    const backup: RawKey[] = [];
    try {
      await this.transport.beginSession?.();
      const numbers = this.profile.needFlash
        ? this.profile.keyNumbers
        : [keyNumber];
      for (const n of numbers) backup.push(await this.readRaw(n));
      onBackup?.(backup);
      if (this.profile.needFlash) {
        this.transport.clear();
        await this.transport.send(new Uint8Array([1, 128, 128, 1, 0, 0, 0, 0]));
        await this.transport.next();
      }
      // Legacy flash models erase the entire bank: replay every other raw key.
      const targets = this.profile.needFlash
        ? backup
        : [{ keyNumber, length: 8, packets: [payload] }];
      for (const raw of targets) {
        await this.writeRaw(
          raw.keyNumber === keyNumber
            ? { keyNumber, length: 8, packets: [payload] }
            : raw,
        );
      }
      for (const raw of targets) {
        const actual = await this.readRaw(raw.keyNumber);
        const expected =
          raw.keyNumber === keyNumber ? { length: 8, packets: [payload] } : raw;
        if (
          actual.length !== expected.length ||
          expected.packets.some((p, i) =>
            p.some((b, j) => actual.packets[i]?.[j] !== b),
          )
        )
          throw new Error(
            `키 ${raw.keyNumber} 읽기 검증 실패. 저장이 완료되지 않았을 수 있습니다. 원본 백업을 보관하세요.`,
          );
      }
      return { keyNumber, verified: true, backup };
    } finally {
      try {
        await this.transport.endSession?.();
      } finally {
        this.busy = false;
      }
    }
  }
}
