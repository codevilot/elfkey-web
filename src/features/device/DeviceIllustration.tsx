import { useId } from "react";
interface Props {
  pedal: boolean;
  count: number;
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}
export function DeviceIllustration({
  pedal,
  count,
  selected,
  onSelect,
  disabled = false,
}: Props) {
  const uid = useId().replaceAll(":", ""),
    body = `body${uid}`,
    face = `face${uid}`;
  const n = pedal ? Math.min(count, 3) : Math.min(count, 12),
    columns = pedal ? n : Math.min(n, 4),
    rows = Math.ceil(n / columns);
  return (
    <svg
      className={`device-art ${pedal ? "device-art--pedal" : ""}`}
      viewBox="0 0 640 330"
      role="group"
      aria-label={
        pedal ? `${n}페달 FootSwitch 장치 그림` : "매크로 키보드 장치 그림"
      }
    >
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#39485d" />
          <stop offset="1" stopColor="#172334" />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#536176" />
          <stop offset="1" stopColor="#29364a" />
        </linearGradient>
        <filter
          id={`shadow${uid}`}
          x="-30%"
          y="-30%"
          width="160%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="20"
            stdDeviation="14"
            floodColor="#1c365a"
            floodOpacity=".17"
          />
        </filter>
      </defs>
      <path
        d="M320 72V27c0-14 17-16 17-27"
        stroke="#a4adba"
        strokeWidth="7"
        fill="none"
      />
      <ellipse cx="320" cy="286" rx="240" ry="22" fill="#dce4ef" opacity=".6" />
      <g filter={`url(#shadow${uid})`}>
        <path
          d="M100 112Q100 91 124 91H516Q540 91 540 112L560 251Q560 276 533 276H107Q80 276 80 251Z"
          fill={`url(#${body})`}
        />
        <path
          d="M105 110Q105 98 124 98H516Q535 98 535 110L553 243Q553 258 533 258H107Q87 258 87 243Z"
          fill="#354357"
          stroke="#506078"
        />
        <text x="115" y="125" fill="#c3cedd" fontSize="11" letterSpacing="3">
          PCsensor
        </text>
        <circle cx="514" cy="119" r="3.5" fill="#6bd9ba" />
        {Array.from({ length: n }, (_, i) => {
          const col = i % columns,
            row = Math.floor(i / columns),
            w = pedal ? 124 : 88,
            h = pedal ? 109 : Math.min(46, 105 / rows),
            gap = pedal ? 17 : 13,
            x = 320 - (columns * w + (columns - 1) * gap) / 2 + col * (w + gap),
            y = pedal ? 139 : 137 + row * (h + 8);
          return (
            <g
              key={i}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${pedal ? "페달" : "키"} ${i + 1} 선택`}
              aria-pressed={selected === i}
              className={`art-key ${selected === i ? "is-selected" : ""}`}
              onClick={() => !disabled && onSelect(i)}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(i);
                }
              }}
            >
              <rect
                x={x}
                y={y + 6}
                width={w}
                height={h}
                rx={pedal ? 13 : 9}
                fill="#111c2b"
              />
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={pedal ? 13 : 9}
                fill={selected === i ? "#3979ef" : `url(#${face})`}
                stroke={selected === i ? "#8eb7ff" : "#647186"}
                strokeWidth={selected === i ? 2 : 1}
              />
              {pedal &&
                Array.from({ length: 7 }, (_, line) => (
                  <path
                    key={line}
                    d={`M${x + 15} ${y + 19 + line * 9}h${w - 30}`}
                    stroke={selected === i ? "#6e9ef6" : "#708096"}
                    strokeWidth="2"
                    opacity=".6"
                  />
                ))}
              <text
                x={x + w / 2}
                y={y + h - 12}
                textAnchor="middle"
                fill={selected === i ? "white" : "#c0cbda"}
                fontSize="11"
                fontWeight="600"
              >
                {pedal
                  ? ["LEFT", "CENTER", "RIGHT"][i]
                  : String(i + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </g>
      <text
        x="320"
        y="314"
        textAnchor="middle"
        fill="#8a98aa"
        fontSize="10"
        letterSpacing="2"
      >
        {pedal ? `USB FOOT SWITCH · ${n} PEDALS` : "CUSTOM MACRO KEYBOARD"}
      </text>
    </svg>
  );
}
