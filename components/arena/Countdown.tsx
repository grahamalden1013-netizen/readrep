"use client";

import { useEffect, useState } from "react";

/**
 * A countdown that starts from a seeded offset and ticks after mount.
 *
 * Starting from a static value rather than a timestamp keeps the server and
 * first client render identical — no hydration mismatch — while still feeling
 * live once the page is interactive.
 */
export function Countdown({
  hours,
  className = "",
}: {
  hours: number;
  className?: string;
}) {
  const [seconds, setSeconds] = useState(Math.round(hours * 3600));

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (seconds <= 0) {
    return <span className={`tnum ${className}`}>Closed</span>;
  }

  return (
    <span className={`tnum ${className}`}>
      {h > 0 && `${h}h `}
      {m}m{h === 0 && ` ${String(s).padStart(2, "0")}s`}
      <span className="sr-only"> remaining</span>
    </span>
  );
}
