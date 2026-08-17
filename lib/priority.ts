import type {
  AssignmentStatus,
  AssignmentType,
} from "@/lib/generated/prisma/enums";

/**
 * Priority scoring.
 *
 * Deliberately not a due-date sort. Four signals are blended so that a small
 * assignment due tomorrow can outrank a major test two weeks out, while that
 * same test climbs above it once it is a few days away:
 *
 *   urgency   how soon it is due, decaying non-linearly
 *   weight    what kind of work it is (a test matters more than classwork)
 *   workload  how much time it needs
 *   ramp      an extra lift for assessments entering their preparation window
 *
 * Scores are 0-100. Completed and skipped work scores 0 so it drops out of
 * every ranked view without needing a special case at each call site.
 */

export const TYPE_WEIGHT: Record<AssignmentType, number> = {
  MAJOR_ASSESSMENT: 1,
  PROJECT: 0.8,
  QUIZ: 0.75,
  HOMEWORK: 0.5,
  CLASSWORK: 0.35,
  SCHOOL_EVENT: 0.2,
};

const WEIGHTS = { urgency: 0.55, type: 0.3, workload: 0.15 };

/** Workload normalization ceiling — 2 hours counts as a full unit of effort. */
const WORKLOAD_CEILING_MINUTES = 120;

/** Largest bonus an assessment can gain from the preparation ramp. */
const MAX_RAMP_BONUS = 18;

export type PriorityInput = {
  type: AssignmentType;
  status: AssignmentStatus;
  dueAt: Date;
  estimatedMinutes: number;
  /** How many days before an assessment preparation should begin. */
  testPrepLeadDays: number;
  now: Date;
};

/**
 * Urgency decays smoothly with time remaining: due now or overdue is 1,
 * tomorrow ~0.65, a week out ~0.21, a fortnight out ~0.12.
 */
export function urgencyFactor(daysUntilDue: number): number {
  if (daysUntilDue <= 0) return 1;
  return 1 / (1 + daysUntilDue * 0.55);
}

/**
 * Assessments get an increasing bonus as they enter their study window, which
 * is what makes a test start mattering days ahead rather than the night before.
 * Outside the window the bonus is zero.
 */
export function rampBonus(
  type: AssignmentType,
  daysUntilDue: number,
  leadDays: number,
): number {
  if (type !== "MAJOR_ASSESSMENT" && type !== "PROJECT") return 0;
  if (daysUntilDue > leadDays) return 0;
  if (daysUntilDue <= 0) return MAX_RAMP_BONUS;

  // Linear from 0 at the edge of the window to full at the deadline.
  const closeness = (leadDays - daysUntilDue) / leadDays;
  return MAX_RAMP_BONUS * closeness;
}

export function daysUntil(dueAt: Date, now: Date): number {
  return (dueAt.getTime() - now.getTime()) / 86_400_000;
}

export function calculatePriority(input: PriorityInput): number {
  if (input.status === "DONE" || input.status === "SKIPPED") return 0;

  const days = daysUntil(input.dueAt, input.now);

  const urgency = urgencyFactor(days);
  const weight = TYPE_WEIGHT[input.type];
  const workload = Math.min(
    input.estimatedMinutes / WORKLOAD_CEILING_MINUTES,
    1,
  );

  const base =
    100 *
    (WEIGHTS.urgency * urgency +
      WEIGHTS.type * weight +
      WEIGHTS.workload * workload);

  const ramp = rampBonus(input.type, days, input.testPrepLeadDays);

  // Work already begun loses a little priority: finishing it is cheaper than
  // the raw numbers suggest, and it stops half-done items pinning the top.
  const statusFactor = input.status === "IN_PROGRESS" ? 0.92 : 1;

  return Math.round(Math.min((base + ramp) * statusFactor, 100) * 10) / 10;
}

export type PriorityBand = "critical" | "high" | "medium" | "low";

export function priorityBand(score: number): PriorityBand {
  if (score >= 70) return "critical";
  if (score >= 55) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const BAND_LABEL: Record<PriorityBand, string> = {
  critical: "Do first",
  high: "High",
  medium: "Medium",
  low: "Low",
};
