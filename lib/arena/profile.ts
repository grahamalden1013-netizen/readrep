import type {
  ArenaProfile,
  CategoryScores,
  DebateOutcome,
  DebateRun,
  JudgeFeedback,
  PerspectiveFeedback,
} from "@/types/ngn";
import { STARTING_RATING } from "./divisions";
import { applyElo, expectedScore, isUnderdogWin } from "./elo";
import { newlyEarnedBadges } from "./badges";

/**
 * Pure profile transitions. Kept free of React and storage so the rating,
 * badge and streak logic can be reasoned about (and tested) on its own.
 */

const EMPTY_CATEGORIES: CategoryScores = {
  evidence: 0,
  reasoning: 0,
  rebuttal: 0,
  clarity: 0,
  opponentUnderstanding: 0,
  civility: 0,
};

export function createProfile(username: string): ArenaProfile {
  return {
    username,
    firstName: null,
    role: "student",
    rating: STARTING_RATING,
    peakRating: STARTING_RATING,
    ratingHistory: [],
    debatesCompleted: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    perspectiveScores: [],
    switchSidesCompleted: 0,
    categoryTotals: { ...EMPTY_CATEGORIES },
    categorySamples: 0,
    badges: [],
    streakDays: 0,
    lastActiveDate: null,
    school: null,
    state: null,
    gradeBand: null,
    interests: [],
    onboarded: false,
    issueProfile: null,
    issueProfileVisible: false,
  };
}

export function outcomeFor(userScore: number, opponentScore: number): DebateOutcome {
  if (userScore > opponentScore) return "win";
  if (userScore < opponentScore) return "loss";
  return "draw";
}

/** Local YYYY-MM-DD, so a streak follows the student's own calendar day. */
function todayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function nextStreak(profile: ArenaProfile, now: Date): number {
  const today = todayKey(now);
  if (profile.lastActiveDate === today) return profile.streakDays;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return profile.lastActiveDate === todayKey(yesterday)
    ? profile.streakDays + 1
    : 1;
}

export type CompletedDebate = {
  profile: ArenaProfile;
  outcome: DebateOutcome;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  opponentRatingAfter: number;
  opponentDelta: number;
  newBadges: string[];
};

/**
 * Apply a finished debate to a profile: rating, record, running category
 * averages, streak and badges.
 */
export function applyDebateResult({
  profile,
  userScore,
  opponentScore,
  opponentRating,
  now = new Date(),
}: {
  profile: ArenaProfile;
  userScore: JudgeFeedback;
  opponentScore: JudgeFeedback;
  opponentRating: number;
  now?: Date;
}): CompletedDebate {
  const outcome = outcomeFor(userScore.overall, opponentScore.overall);

  const update = applyElo({
    rating: profile.rating,
    opponentRating,
    outcome,
    debatesCompleted: profile.debatesCompleted,
  });

  const categoryTotals = { ...profile.categoryTotals };
  for (const key of Object.keys(categoryTotals) as (keyof CategoryScores)[]) {
    categoryTotals[key] += userScore.categories[key];
  }

  const next: ArenaProfile = {
    ...profile,
    rating: update.ratingAfter,
    peakRating: Math.max(profile.peakRating, update.ratingAfter),
    debatesCompleted: profile.debatesCompleted + 1,
    wins: profile.wins + (outcome === "win" ? 1 : 0),
    losses: profile.losses + (outcome === "loss" ? 1 : 0),
    draws: profile.draws + (outcome === "draw" ? 1 : 0),
    categoryTotals,
    categorySamples: profile.categorySamples + 1,
    streakDays: nextStreak(profile, now),
    lastActiveDate: todayKey(now),
    ratingHistory: [
      ...profile.ratingHistory,
      {
        at: now.toISOString(),
        rating: update.ratingAfter,
        delta: update.delta,
        debateSlug: "",
        outcome,
      },
    ],
  };

  // Two badges depend on the specific result rather than a running average.
  const expected = expectedScore(profile.rating, opponentRating);
  const earnedNow: string[] = [];

  if (isUnderdogWin(expected, outcome)) {
    next.badges = [...next.badges, { id: "underdog-win", earnedAt: now.toISOString() }];
    earnedNow.push("underdog-win");
  }
  if (userScore.categories.civility === 100) {
    next.badges = [...next.badges, { id: "perfect-civility", earnedAt: now.toISOString() }];
    earnedNow.push("perfect-civility");
  }

  for (const id of newlyEarnedBadges(next)) {
    next.badges = [...next.badges, { id, earnedAt: now.toISOString() }];
    earnedNow.push(id);
  }

  return {
    profile: next,
    outcome,
    ratingBefore: update.ratingBefore,
    ratingAfter: update.ratingAfter,
    delta: update.delta,
    opponentRatingAfter: update.opponentRatingAfter,
    opponentDelta: update.opponentDelta,
    newBadges: earnedNow,
  };
}

/**
 * Record a Switch Sides result.
 *
 * Note what this function does NOT touch: `rating`, `wins`, `losses`,
 * `ratingHistory`. Perspective work is deliberately walled off from
 * competitive standing so it can never be farmed for ladder points — and so a
 * student is never penalised for taking the exercise seriously.
 */
export function applyPerspectiveResult({
  profile,
  feedback,
  now = new Date(),
}: {
  profile: ArenaProfile;
  feedback: PerspectiveFeedback;
  now?: Date;
}): { profile: ArenaProfile; newBadges: string[] } {
  const next: ArenaProfile = {
    ...profile,
    perspectiveScores: [...profile.perspectiveScores, feedback.score],
    switchSidesCompleted: profile.switchSidesCompleted + 1,
  };

  const earnedNow: string[] = [];
  for (const id of newlyEarnedBadges(next)) {
    next.badges = [...next.badges, { id, earnedAt: now.toISOString() }];
    earnedNow.push(id);
  }

  return { profile: next, newBadges: earnedNow };
}

export function averagePerspective(profile: ArenaProfile): number | null {
  if (profile.perspectiveScores.length === 0) return null;
  const sum = profile.perspectiveScores.reduce((a, b) => a + b, 0);
  return Math.round(sum / profile.perspectiveScores.length);
}

export function categoryAverages(profile: ArenaProfile): CategoryScores | null {
  if (profile.categorySamples === 0) return null;
  const out = { ...EMPTY_CATEGORIES };
  for (const key of Object.keys(out) as (keyof CategoryScores)[]) {
    out[key] = Math.round(profile.categoryTotals[key] / profile.categorySamples);
  }
  return out;
}

export function bestCategory(profile: ArenaProfile): keyof CategoryScores | null {
  const averages = categoryAverages(profile);
  if (!averages) return null;
  return (Object.keys(averages) as (keyof CategoryScores)[]).reduce((max, key) =>
    averages[key] > averages[max] ? key : max,
  );
}

/** Rounds still to write in a run, used by the debate header progress. */
export function roundsRemaining(run: DebateRun, totalRounds: number): number {
  return Math.max(0, totalRounds - run.rounds.length);
}
