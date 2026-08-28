import type { Division, DivisionName } from "@/types/ngn";

/**
 * Division thresholds. Deliberately wide at the bottom so a new student is not
 * demoted after one rough debate, and narrow at the top so Champion means
 * something.
 */
export const DIVISION_TABLE: Division[] = [
  { name: "Bronze", min: 0, max: 1099, colorVar: "var(--color-bronze)" },
  { name: "Silver", min: 1100, max: 1299, colorVar: "var(--color-silver)" },
  { name: "Gold", min: 1300, max: 1499, colorVar: "var(--color-gold)" },
  { name: "Platinum", min: 1500, max: 1699, colorVar: "var(--color-platinum)" },
  { name: "Diamond", min: 1700, max: 1899, colorVar: "var(--color-diamond)" },
  { name: "Master", min: 1900, max: 2099, colorVar: "var(--color-master)" },
  { name: "Champion", min: 2100, max: Infinity, colorVar: "var(--color-champion)" },
];

export const STARTING_RATING = 1200;

export function divisionFor(rating: number): Division {
  return (
    DIVISION_TABLE.find((d) => rating >= d.min && rating <= d.max) ??
    DIVISION_TABLE[0]
  );
}

export function divisionName(rating: number): DivisionName {
  return divisionFor(rating).name;
}

/** Progress (0–1) through the current division, for the profile progress bar. */
export function divisionProgress(rating: number): number {
  const division = divisionFor(rating);
  if (!Number.isFinite(division.max)) return 1;
  const span = division.max - division.min + 1;
  return Math.min(1, Math.max(0, (rating - division.min) / span));
}

/** Points still needed to promote, or null at the top division. */
export function pointsToNextDivision(rating: number): number | null {
  const division = divisionFor(rating);
  if (!Number.isFinite(division.max)) return null;
  return division.max + 1 - rating;
}

export function nextDivision(rating: number): DivisionName | null {
  const index = DIVISION_TABLE.findIndex((d) => d.name === divisionFor(rating).name);
  return DIVISION_TABLE[index + 1]?.name ?? null;
}
