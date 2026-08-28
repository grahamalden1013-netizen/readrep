import type { Debate, DebateFormat, Opponent, RoundType } from "@/types/ngn";
import { SEED_STUDENTS } from "@/data/demo/community";
import { divisionName } from "./divisions";
import { SCHOOL_BY_SLUG } from "@/data/demo/community";

/**
 * Demo matchmaking.
 *
 * Matching considers rating, the opposite assigned side, and format. It never
 * considers race, gender, religion, or any other identity characteristic —
 * there is no field in the model that could carry one, which is the point.
 */

export const AI_OPPONENT: Opponent = {
  id: "ngn-practice",
  username: "NGN Practice Partner",
  rating: 1200,
  division: "Silver",
  isAI: true,
};

/**
 * Find the closest-rated seeded student. In production this queries a live
 * pool; the selection criteria are identical.
 */
export function findOpponent(rating: number, seed = 0): Opponent {
  const pool = [...SEED_STUDENTS].sort(
    (a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating),
  );

  // Take from the three nearest so a rematch is not always the same person.
  const candidates = pool.slice(0, 3);
  const picked = candidates[seed % candidates.length] ?? pool[0];

  return {
    id: picked.username,
    username: picked.username,
    rating: picked.rating,
    division: divisionName(picked.rating),
    school: SCHOOL_BY_SLUG.get(picked.schoolSlug)?.name,
    isAI: false,
  };
}

/** A practice opponent calibrated to the student, for when no match is found. */
export function aiOpponentFor(rating: number): Opponent {
  return {
    ...AI_OPPONENT,
    rating: Math.round(rating),
    division: divisionName(rating),
  };
}

/**
 * The opponent's line for a given round, drawn from the debate's seeded
 * argument bank. `variant` rotates the choice so a rematch reads differently.
 */
export function opponentLine(
  debate: Debate,
  opponentPosition: "support" | "oppose",
  roundType: RoundType,
  variant: number,
): string {
  const bank = debate.argumentBank[opponentPosition][roundType];
  if (!bank || bank.length === 0) {
    // Every debate seeds opening and closing; fall back to the opening line
    // rather than showing an empty panel.
    const fallback = debate.argumentBank[opponentPosition].opening;
    return fallback[variant % fallback.length] ?? "";
  }
  return bank[variant % bank.length];
}

/** How long the demo opponent "takes" to submit, in ms. */
export function opponentThinkingTime(format: DebateFormat): number {
  return format === "quick" ? 1400 : format === "standard" ? 1900 : 2400;
}
