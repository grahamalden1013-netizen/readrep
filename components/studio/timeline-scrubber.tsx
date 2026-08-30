"use client";

import { formatTimecode } from "@/lib/reps/timing";

export type Marker = { key: "clipStartMs" | "decisionPauseMs" | "clipEndMs"; label: string; ms: number };

const MARKER_COLOR: Record<Marker["key"], string> = {
  clipStartMs: "bg-fg-faint",
  decisionPauseMs: "bg-accent",
  clipEndMs: "bg-fg-faint",
};

/**
 * Scrub bar with the three rep timestamps drawn on it, so a reviewer can see
 * the clip window and the decision point against the whole game at a glance.
 */
export function TimelineScrubber({
  currentMs,
  durationMs,
  markers,
  onScrub,
}: {
  currentMs: number;
  durationMs: number | null;
  markers: Marker[];
  onScrub: (ms: number) => void;
}) {
  const total = durationMs && durationMs > 0 ? durationMs : null;
  const pct = (ms: number) => (total ? Math.min(100, Math.max(0, (ms / total) * 100)) : 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-8">
        {/* Marker ticks sit behind the input so the thumb stays grabbable. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sunken">
          {total
            ? markers.map((marker) => (
                <span
                  key={marker.key}
                  title={`${marker.label} ${formatTimecode(marker.ms)}`}
                  className={`absolute top-1/2 h-4 w-0.5 -translate-y-1/2 ${MARKER_COLOR[marker.key]}`}
                  style={{ left: `${pct(marker.ms)}%` }}
                />
              ))
            : null}
          {total ? (
            <span
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/25"
              style={{
                left: `${pct(markers.find((m) => m.key === "clipStartMs")?.ms ?? 0)}%`,
                width: `${
                  pct(markers.find((m) => m.key === "clipEndMs")?.ms ?? 0) -
                  pct(markers.find((m) => m.key === "clipStartMs")?.ms ?? 0)
                }%`,
              }}
            />
          ) : null}
        </div>

        <input
          type="range"
          min={0}
          max={total ?? 100}
          step={100}
          value={Math.min(currentMs, total ?? 100)}
          disabled={!total}
          aria-label="Scrub the video"
          onChange={(event) => onScrub(Number(event.target.value))}
          className="absolute inset-x-0 top-1/2 h-8 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-fg [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-fg"
        />
      </div>

      <div className="flex justify-between font-mono text-xs text-fg-faint tabular-nums">
        <span>{formatTimecode(currentMs)}</span>
        <span>{total ? formatTimecode(total) : "—:—"}</span>
      </div>
    </div>
  );
}
