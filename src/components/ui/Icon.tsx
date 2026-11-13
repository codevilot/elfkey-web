import type { CSSProperties } from "react";
export type IconName =
  | "usb"
  | "keyboard"
  | "settings"
  | "arrow"
  | "check"
  | "download"
  | "upload"
  | "refresh"
  | "info"
  | "chevron"
  | "spark"
  | "disconnect"
  | "code"
  | "plus";
const paths: Record<IconName, string> = {
  usb: "M12 3v13m0-13-3 3m3-3 3 3M7 9v3l5 3 5-3V8M5 7h4v3H5zM15 5h4v3h-4zM9 19a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  keyboard:
    "M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2m2 4h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01M8 17h8",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8m0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4",
  upload: "M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4",
  refresh: "M20 7v5h-5M4 17v-5h5m10-4a8 8 0 0 0-14-2M5 16a8 8 0 0 0 14 2",
  info: "M12 8h.01M12 11v5m0-13a9 9 0 1 0 0 18 9 9 0 1 0 0-18",
  chevron: "m9 5 7 7-7 7",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  disconnect: "m4 4 16 16M8 5h8v7a4 4 0 0 1-7 2M10 3v3m4-3v3m-2 10v5",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16",
  plus: "M12 5v14M5 12h14",
};
export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
