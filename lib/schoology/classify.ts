import type { AssignmentType } from "@/lib/generated/prisma/enums";

/**
 * Classifies a Schoology calendar event from its title.
 *
 * Schoology titles carry an intent prefix before a colon — "HW: Problem Set 1",
 * "MAJOR: Unit 1 Assessment", "HW 1.2: Grabación". The prefix is authoritative:
 * "HW: study for the quiz" is homework, not a quiz, so the prefix is always
 * matched first and only then do we fall back to scanning the whole title.
 */

type Rule = { type: AssignmentType; pattern: RegExp };

/**
 * Order matters. Major-assessment words are tested first because titles like
 * "MAJOR: Summer Assignment Mini Assessment" contain words that would
 * otherwise match weaker rules.
 */
const RULES: Rule[] = [
  {
    type: "MAJOR_ASSESSMENT",
    pattern: /\b(major|exam|assessment|test|midterm|final)\b/i,
  },
  { type: "QUIZ", pattern: /\b(quiz|quizzes)\b/i },
  { type: "PROJECT", pattern: /\b(project|presentation|lab report)\b/i },
  { type: "HOMEWORK", pattern: /\b(hw|homework|assignment)\b/i },
  { type: "CLASSWORK", pattern: /\b(cw|classwork|class work|do now)\b/i },
];

/** Longest plausible prefix; anything longer is a sentence, not a label. */
const MAX_PREFIX_LENGTH = 40;

export type Classification = {
  type: AssignmentType;
  /** Title with the prefix stripped, e.g. "HW 1.2: Grabación" -> "Grabación". */
  cleanTitle: string;
  /** Course name when one can be recovered, otherwise null. */
  course: string | null;
};

/**
 * Splits "HW 1.2: Grabación" into its label and remainder. Returns null when
 * there is no colon, or when the text before it is too long to be a label.
 */
function splitPrefix(title: string): { prefix: string; rest: string } | null {
  const index = title.indexOf(":");
  if (index <= 0 || index > MAX_PREFIX_LENGTH) return null;
  const prefix = title.slice(0, index).trim();
  const rest = title.slice(index + 1).trim();
  if (!prefix || !rest) return null;
  return { prefix, rest };
}

function matchRules(text: string): AssignmentType | null {
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.type;
  }
  return null;
}

/**
 * Attempts to recover a course name.
 *
 * Schoology's calendar feed does not include the course in a consistent place,
 * so this only reports a course when the data actually says so — a bracketed or
 * parenthesised suffix, or an explicit "Course:" line in the description. It
 * returns null rather than guessing.
 */
export function extractCourse(
  title: string,
  description?: string | null,
): string | null {
  const bracketed = title.match(/[([]([^)\]]{2,60})[)\]]\s*$/);
  if (bracketed) {
    const candidate = bracketed[1].trim();
    // Ignore things that are clearly not course names.
    if (!/^\d+$/.test(candidate) && !/^(due|pts?|points?)\b/i.test(candidate)) {
      return candidate;
    }
  }

  if (description) {
    const labelled = description.match(/^\s*course\s*:\s*(.{2,60})$/im);
    if (labelled) return labelled[1].trim();
  }

  return null;
}

export function classifyEvent(
  title: string,
  description?: string | null,
): Classification {
  const trimmed = title.trim();
  const course = extractCourse(trimmed, description);

  const split = splitPrefix(trimmed);
  if (split) {
    const fromPrefix = matchRules(split.prefix);
    if (fromPrefix) {
      return { type: fromPrefix, cleanTitle: split.rest, course };
    }
  }

  const fromWholeTitle = matchRules(trimmed);
  if (fromWholeTitle) {
    return { type: fromWholeTitle, cleanTitle: trimmed, course };
  }

  // Anything else on the Schoology calendar is still schoolwork.
  return { type: "SCHOOL_EVENT", cleanTitle: trimmed, course };
}

/** Human label for a type, used on badges and in the coach's context later. */
export const TYPE_LABEL: Record<AssignmentType, string> = {
  MAJOR_ASSESSMENT: "Major",
  QUIZ: "Quiz",
  HOMEWORK: "Homework",
  CLASSWORK: "Classwork",
  PROJECT: "Project",
  SCHOOL_EVENT: "Assignment",
};

/** Types that get spaced, multi-day preparation instead of a single sitting. */
export function needsSpacedPractice(type: AssignmentType): boolean {
  return type === "MAJOR_ASSESSMENT" || type === "PROJECT";
}

export function isAssessment(type: AssignmentType): boolean {
  return type === "MAJOR_ASSESSMENT" || type === "QUIZ";
}
