import type { AssignmentType } from "@/lib/generated/prisma/enums";

/**
 * Estimates how long a piece of work will take.
 *
 * The Schoology feed carries no effort information, so this is a heuristic:
 * a per-type baseline, adjusted by task words that reliably indicate a longer
 * or shorter piece of work. For major assessments the number is the *total*
 * preparation budget, which the test-prep planner then spreads across days.
 */

const BASELINE: Record<AssignmentType, number> = {
  MAJOR_ASSESSMENT: 120,
  PROJECT: 90,
  QUIZ: 45,
  HOMEWORK: 30,
  CLASSWORK: 20,
  SCHOOL_EVENT: 20,
};

/** Multipliers for words that signal a heavier or lighter task. */
const MODIFIERS: { pattern: RegExp; factor: number }[] = [
  { pattern: /\b(essay|paper|write[- ]?up|research|lab report)\b/i, factor: 1.6 },
  { pattern: /\b(read|reading|chapter|novel|article)\b/i, factor: 1.3 },
  { pattern: /\b(study|review|practice)\b/i, factor: 1.2 },
  { pattern: /\b(problem set|worksheet|packet|exercises)\b/i, factor: 1.15 },
  { pattern: /\b(watch|video|listen|grabaci[óo]n|recording)\b/i, factor: 0.8 },
  { pattern: /\b(bring|permission|form|sign|reminder|no school)\b/i, factor: 0.4 },
];

const MIN_MINUTES = 10;
const MAX_MINUTES = 240;

/** Rounds to the nearest 5 minutes so the UI never shows odd numbers. */
function roundToFive(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

export function estimateMinutes(
  type: AssignmentType,
  title: string,
  description?: string | null,
): number {
  let minutes = BASELINE[type];

  // Only the title and the opening of the description are considered; a long
  // description would otherwise match every modifier at once.
  const text = `${title} ${(description ?? "").slice(0, 400)}`;

  let factor = 1;
  for (const modifier of MODIFIERS) {
    if (modifier.pattern.test(text)) {
      factor *= modifier.factor;
    }
  }

  // Keep the combined effect of several matches within sane bounds.
  factor = Math.min(Math.max(factor, 0.4), 2);
  minutes = minutes * factor;

  return Math.min(Math.max(roundToFive(minutes), MIN_MINUTES), MAX_MINUTES);
}
