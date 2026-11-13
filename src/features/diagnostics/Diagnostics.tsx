import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { downloadJson } from "../../components/ui/files";
import type { DeviceController } from "../device/useDevice";
const hex = (value: number): string =>
  `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
export function Diagnostics({ device }: { device: DeviceController }) {
  return (
    <details className="diagnostics">
      <summary>
        <span>
          <Icon name="code" size={17} />
          장치 정보와 연결 기록
        </span>
        <span>
          문제가 있을 때 확인하세요 <Icon name="chevron" size={14} />
        </span>
      </summary>
      <div className="diagnostics-body">
        <dl>
          <div>
            <dt>모델</dt>
            <dd>{device.profile?.model ?? "—"}</dd>
          </div>
          <div>
            <dt>Vendor ID</dt>
            <dd>{device.info ? hex(device.info.vendorId) : "—"}</dd>
          </div>
          <div>
            <dt>Product ID</dt>
            <dd>{device.info ? hex(device.info.productId) : "—"}</dd>
          </div>
        </dl>
        <Button
          onClick={() =>
            downloadJson("elfkey-diagnostics.json", {
              device: device.info,
              profile: device.profile,
              logs: device.logs,
            })
          }
        >
          <Icon name="download" size={16} />
          진단 정보 다운로드
        </Button>
        {device.backup && (
          <Button
            onClick={() =>
              downloadJson("elfkey-original-backup.json", device.backup)
            }
          >
            <Icon name="download" size={16} />
            변경 전 원본 백업
          </Button>
        )}
        <pre>
          {device.logs
            .map((log) => `${log.time.slice(11, 19)} ${log.message}`)
            .join("\n") || "아직 연결 기록이 없어요."}
        </pre>
        <details>
          <summary>HID 보고서 구조</summary>
          <pre>{JSON.stringify(device.info, null, 2)}</pre>
        </details>
      </div>
    </details>
  );
}
