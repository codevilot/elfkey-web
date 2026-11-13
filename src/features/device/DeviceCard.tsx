import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import type { DeviceController } from "./useDevice";
export function DeviceCard({ device }: { device: DeviceController }) {
  const connected = !!device.profile;
  return (
    <section className="device-card">
      <div className="device-card__icon">
        <Icon name="usb" size={27} />
      </div>
      <div className="device-card__identity">
        <span className="eyebrow">
          {connected ? "연결된 장치" : "먼저 장치를 연결하세요"}
        </span>
        <h2>{device.profile?.model ?? "내 USB 장치"}</h2>
        <p>
          {connected
            ? `${device.slots.length}개 설정 슬롯 · ${device.profile?.is24 ? "2.4GHz USB 수신기" : "USB 유선 연결"} · 설정 작업 후 자동 해제`
            : "PCsensor 키보드·풋스위치를 USB로 연결해주세요."}
        </p>
      </div>
      <div className="device-card__actions">
        {connected ? (
          <>
            <span className="status-pill">
              <i />
              연결됨
            </span>
            <Button
              variant="ghost"
              disabled={device.busy}
              onClick={() => void device.disconnect()}
            >
              <Icon name="disconnect" size={16} />
              연결 해제
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            id="connect"
            disabled={device.busy}
            onClick={() => void device.connect()}
          >
            <Icon name="usb" size={18} />
            {device.busy ? "장치 확인 중…" : "USB 장치 연결"}
          </Button>
        )}
      </div>
    </section>
  );
}
