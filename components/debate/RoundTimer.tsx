"use client";

import { useEffect, useState } from "react";

/**
 * Round timer.
 *
 * Advisory rather than enforcing: it turns amber, then red, but it never
 * submits for a student or wipes their draft. Timing out mid-sentence would
 * punish careful writing, which is the opposite of the point.
 */
export function RoundTimer({
  seconds,
  running,
  onExpire,
}: {
  seconds: number;
  running: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [trackedSeconds, setTrackedSeconds] = useState(seconds);

  // Reset during render when the round changes, rather than in an effect —
  // an effect would render the stale time for one frame first.
  if (trackedSeconds !== seconds) {
    setTrackedSeconds(seconds);
    setRemaining(seconds);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(id);
          onExpire?.();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const ratio = seconds > 0 ? remaining / seconds : 0;

  const tone =
    remaining === 0
      ? "text-ink-faint"
      : ratio < 0.15
        ? "text-live"
        : ratio < 0.35
          ? "text-warn"
          : "text-ink";

  return (
    <span
      className={`tnum text-sm font-semibold tabular-nums ${tone}`}
      aria-label={`${minutes} minutes ${secs} seconds remaining`}
    >
      {remaining === 0 ? "Time up" : `${minutes}:${String(secs).padStart(2, "0")}`}
    </span>
  );
}
