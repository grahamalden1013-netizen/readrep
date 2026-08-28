import type { DivisionName } from "@/types/ngn";
import { divisionFor, divisionProgress, nextDivision, pointsToNextDivision } from "@/lib/arena/divisions";

/**
 * Division marks. Deliberately typographic rather than illustrated — a crest
 * or a gem would push the whole product toward the gamer aesthetic the brand
 * is trying to avoid.
 */

const DIVISION_COLOR: Record<DivisionName, string> = {
  Bronze: "var(--color-bronze)",
  Silver: "var(--color-silver)",
  Gold: "var(--color-gold)",
  Platinum: "var(--color-platinum)",
  Diamond: "var(--color-diamond)",
  Master: "var(--color-master)",
  Champion: "var(--color-champion)",
};

export function DivisionBadge({
  division,
  size = "md",
}: {
  division: DivisionName;
  size?: "sm" | "md";
}) {
  const color = DIVISION_COLOR[division];
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em]"
          : "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"
      }
      style={{ color }}
    >
      <span
        aria-hidden
        className={size === "sm" ? "block size-1.5 rotate-45" : "block size-2 rotate-45"}
        style={{ backgroundColor: color }}
      />
      {division}
    </span>
  );
}

export function RatingDisplay({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl sm:text-5xl",
  } as const;
  return (
    <span className={`tnum font-semibold leading-none ${sizes[size]}`}>
      {rating}
    </span>
  );
}

export function RatingDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="tnum text-sm font-medium text-ink-mute">±0</span>;
  }
  const positive = delta > 0;
  return (
    <span
      className={`tnum text-sm font-semibold ${positive ? "text-support" : "text-oppose"}`}
    >
      {positive ? "+" : "−"}
      {Math.abs(delta)}
    </span>
  );
}

/** Rating, division, and the distance to the next one. */
export function DivisionProgress({ rating }: { rating: number }) {
  const division = divisionFor(rating);
  const next = nextDivision(rating);
  const remaining = pointsToNextDivision(rating);
  const progress = divisionProgress(rating);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <DivisionBadge division={division.name} size="sm" />
        <span className="text-xs text-ink-mute">
          {next && remaining !== null
            ? `${remaining} to ${next}`
            : "Top division"}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-paper-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: DIVISION_COLOR[division.name],
          }}
        />
      </div>
    </div>
  );
}
