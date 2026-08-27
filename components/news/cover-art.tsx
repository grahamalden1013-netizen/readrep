import type { CoverArt } from "@/types/ngn";
import { cn } from "@/lib/utils";

/**
 * Generated cover art.
 *
 * NGN's demo build ships without photography: every story renders a
 * deterministic abstract plate derived from its `cover` spec. When a real image
 * pipeline is connected, swap this component for `next/image` and keep the
 * same aspect-ratio wrapper.
 */
export function CoverPlate({
  cover,
  label,
  className,
  ratio = "aspect-[16/9]",
  eager = false,
}: {
  cover: CoverArt;
  label?: string;
  className?: string;
  ratio?: string;
  eager?: boolean;
}) {
  const { hue, pattern } = cover;
  const id = `${pattern}-${hue}`;

  return (
    <div
      className={cn(
        "cover-plate relative isolate overflow-hidden rounded-[calc(var(--radius-card)-3px)] border border-hairline",
        ratio,
        className,
      )}
      style={
        {
          "--plate": `oklch(0.62 0.11 ${hue})`,
        } as React.CSSProperties
      }
      role="img"
      aria-label={label ? `Illustration for ${label}` : "Abstract cover illustration"}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(150deg, oklch(0.95 0.03 ${hue}) 0%, oklch(0.9 0.05 ${hue + 18}) 100%)`,
        }}
      />
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 400 225"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        fill="none"
      >
        <defs>
          <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--plate)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--plate)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <Pattern pattern={pattern} id={id} />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_10%_0%,transparent_35%,rgb(0_0_0/0.1)_100%)]" />
      {eager ? null : null}
    </div>
  );
}

function Pattern({ pattern, id }: { pattern: CoverArt["pattern"]; id: string }) {
  const stroke = "var(--plate)";

  switch (pattern) {
    case "grid":
      return (
        <g stroke={stroke} strokeOpacity="0.45" strokeWidth="1">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 34} y1="0" x2={i * 34} y2="225" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 34} x2="400" y2={i * 34} />
          ))}
          <rect
            x="102"
            y="34"
            width="136"
            height="102"
            fill={`url(#fade-${id})`}
            stroke="none"
          />
        </g>
      );
    case "arc":
      return (
        <g>
          {Array.from({ length: 7 }).map((_, i) => (
            <circle
              key={i}
              cx="80"
              cy="200"
              r={50 + i * 42}
              stroke={stroke}
              strokeOpacity={0.5 - i * 0.055}
              strokeWidth="1.5"
            />
          ))}
          <circle cx="80" cy="200" r="26" fill={`url(#fade-${id})`} />
        </g>
      );
    case "ridge":
      return (
        <g>
          {Array.from({ length: 16 }).map((_, i) => (
            <rect
              key={i}
              x={16 + i * 24}
              y={190 - ((i * 37) % 130) - 20}
              width="10"
              height={((i * 37) % 130) + 30}
              fill={stroke}
              fillOpacity={0.18 + ((i % 4) * 0.09)}
              rx="2"
            />
          ))}
          <line
            x1="0"
            y1="190"
            x2="400"
            y2="190"
            stroke={stroke}
            strokeOpacity="0.5"
          />
        </g>
      );
    case "orbit":
      return (
        <g stroke={stroke} fill="none">
          <ellipse
            cx="200"
            cy="112"
            rx="150"
            ry="58"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
          <ellipse
            cx="200"
            cy="112"
            rx="150"
            ry="58"
            strokeOpacity="0.3"
            strokeWidth="1.5"
            transform="rotate(60 200 112)"
          />
          <ellipse
            cx="200"
            cy="112"
            rx="150"
            ry="58"
            strokeOpacity="0.3"
            strokeWidth="1.5"
            transform="rotate(-60 200 112)"
          />
          <circle cx="200" cy="112" r="30" fill={`url(#fade-${id})`} stroke="none" />
        </g>
      );
    case "column":
      return (
        <g>
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x={40 + i * 56}
              y="40"
              width="30"
              height="145"
              rx="15"
              fill={stroke}
              fillOpacity={0.14 + i * 0.05}
            />
          ))}
          <line
            x1="20"
            y1="185"
            x2="380"
            y2="185"
            stroke={stroke}
            strokeOpacity="0.55"
            strokeWidth="2"
          />
        </g>
      );
    case "wave":
    default:
      return (
        <g stroke={stroke} fill="none" strokeWidth="1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M-20 ${40 + i * 20} C 80 ${10 + i * 20}, 180 ${90 + i * 18}, 420 ${30 + i * 20}`}
              strokeOpacity={0.5 - i * 0.04}
            />
          ))}
        </g>
      );
  }
}
