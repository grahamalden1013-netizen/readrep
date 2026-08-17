import { DateTime } from "luxon";

/**
 * Spaced preparation for major assessments.
 *
 * The point is to stop the night-before cram: preparation ramps up over
 * several days and then eases into review on the eve of the test. A test on
 * Monday with a 4-day lead produces something like
 *
 *   Thursday  20 min  first pass
 *   Friday    30 min  practice problems
 *   Saturday  45 min  weak topics
 *   Sunday    30 min  final review
 *
 * The shape adapts to how much time is actually left.
 */

export type PrepSession = {
  /** Calendar day the session belongs to, at local midnight. */
  day: Date;
  minutes: number;
  /** Short description of the goal for that sitting. */
  focus: string;
  daysBeforeTest: number;
};

/**
 * Relative effort per session, ordered from the first day of study to the last.
 * Weight rises through the middle then drops for review — the final session is
 * consolidation, not new material.
 */
const CURVES: Record<number, number[]> = {
  1: [1],
  2: [0.45, 0.55],
  3: [0.28, 0.42, 0.3],
  4: [0.17, 0.25, 0.35, 0.23],
  5: [0.13, 0.19, 0.25, 0.27, 0.16],
  6: [0.11, 0.15, 0.19, 0.22, 0.21, 0.12],
  7: [0.09, 0.12, 0.16, 0.18, 0.19, 0.16, 0.1],
};

const FOCUS_FIRST = "First pass over the material";
const FOCUS_PRACTICE = "Practice problems";
const FOCUS_WEAK = "Drill the weak topics";
const FOCUS_REVIEW = "Final review";
const FOCUS_ONLY = "Study session";

function focusFor(index: number, total: number): string {
  if (total === 1) return FOCUS_ONLY;
  if (index === total - 1) return FOCUS_REVIEW;
  if (index === 0) return FOCUS_FIRST;
  if (index === total - 2) return FOCUS_WEAK;
  return FOCUS_PRACTICE;
}

function roundToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

/**
 * Builds the preparation schedule for one assessment.
 *
 * Sessions land on the days *before* the test, never the day of it. Returns an
 * empty list when the test has passed or there is no day left to study.
 */
export function buildPrepSchedule(options: {
  dueAt: Date;
  totalMinutes: number;
  leadDays: number;
  timezone: string;
  now: Date;
}): PrepSession[] {
  const { dueAt, totalMinutes, leadDays, timezone, now } = options;

  const testDay = DateTime.fromJSDate(dueAt, { zone: timezone }).startOf("day");
  const today = DateTime.fromJSDate(now, { zone: timezone }).startOf("day");

  // Nothing to plan once the test day has arrived or passed.
  const daysAvailable = Math.floor(testDay.diff(today, "days").days);
  if (daysAvailable <= 0) return [];

  const sessionCount = Math.min(daysAvailable, leadDays, 7);
  if (sessionCount <= 0) return [];

  const curve = CURVES[sessionCount] ?? CURVES[7];

  // Study runs over the `sessionCount` days immediately before the test, so
  // preparation finishes the day before rather than trailing off early.
  const firstDay = testDay.minus({ days: sessionCount });

  const sessions: PrepSession[] = [];
  for (let index = 0; index < sessionCount; index += 1) {
    const day = firstDay.plus({ days: index });
    if (day < today) continue;

    sessions.push({
      day: day.toJSDate(),
      minutes: roundToFive(totalMinutes * curve[index]),
      focus: focusFor(index, sessionCount),
      daysBeforeTest: Math.round(testDay.diff(day, "days").days),
    });
  }

  return sessions;
}

/** Whole-days remaining until the assessment, from the student's perspective. */
export function daysRemaining(
  dueAt: Date,
  now: Date,
  timezone: string,
): number {
  const testDay = DateTime.fromJSDate(dueAt, { zone: timezone }).startOf("day");
  const today = DateTime.fromJSDate(now, { zone: timezone }).startOf("day");
  return Math.round(testDay.diff(today, "days").days);
}

export type PrepStatus = "not-started" | "in-progress" | "on-track" | "overdue";

/**
 * Summarises how preparation is going, for the Tests section.
 */
export function prepStatus(options: {
  daysLeft: number;
  plannedSessions: number;
  completedSessions: number;
}): { status: PrepStatus; label: string } {
  const { daysLeft, plannedSessions, completedSessions } = options;

  if (daysLeft < 0) return { status: "overdue", label: "Passed" };
  if (plannedSessions === 0) {
    return daysLeft <= 3
      ? { status: "overdue", label: "No study planned" }
      : { status: "not-started", label: "Not scheduled yet" };
  }
  if (completedSessions === 0) {
    return { status: "not-started", label: `0 of ${plannedSessions} sessions done` };
  }
  if (completedSessions >= plannedSessions) {
    return { status: "on-track", label: "Preparation complete" };
  }
  return {
    status: "in-progress",
    label: `${completedSessions} of ${plannedSessions} sessions done`,
  };
}
