import type { Badge, BadgeId, ArenaProfile } from "@/types/ngn";

/**
 * Badges reward skill and habit, never popularity. Nothing here can be earned
 * by posting more, only by arguing better or by taking the other side
 * seriously.
 */
export const BADGES: Badge[] = [
  {
    id: "first-debate",
    name: "First Debate",
    description: "You entered the Arena and made your case.",
    criterion: "Complete 1 debate",
    target: 1,
  },
  {
    id: "ten-debates",
    name: "Ten Debates",
    description: "Ten full debates. You are building a real record.",
    criterion: "Complete 10 debates",
    target: 10,
  },
  {
    id: "evidence-builder",
    name: "Evidence Builder",
    description: "Your arguments consistently rest on cited evidence.",
    criterion: "Average 80+ on Evidence",
    target: 80,
  },
  {
    id: "strong-rebuttal",
    name: "Strong Rebuttal",
    description: "You answer the argument in front of you, not a easier one.",
    criterion: "Average 80+ on Rebuttal",
    target: 80,
  },
  {
    id: "perspective-master",
    name: "Perspective Master",
    description: "You can make the other side's case as well as they can.",
    criterion: "Score 90+ on a Switch Sides exercise",
    target: 90,
  },
  {
    id: "civil-challenger",
    name: "Civil Challenger",
    description: "You disagree hard without making it personal.",
    criterion: "Average 90+ on Civility",
    target: 90,
  },
  {
    id: "five-day-streak",
    name: "Five-Day Streak",
    description: "Five days running in the Arena.",
    criterion: "Debate 5 days in a row",
    target: 5,
  },
  {
    id: "underdog-win",
    name: "Underdog Win",
    description: "You beat an opponent rated well above you.",
    criterion: "Win a debate you were expected to lose",
    target: 1,
  },
  {
    id: "perfect-civility",
    name: "Perfect Civility",
    description: "A flawless civility score across a full debate.",
    criterion: "Score 100 on Civility",
    target: 100,
  },
  {
    id: "switch-sides-10",
    name: "Switch Sides ×10",
    description: "Ten times you argued the case you disagreed with.",
    criterion: "Complete 10 Switch Sides exercises",
    target: 10,
  },
];

export const BADGE_BY_ID = new Map<BadgeId, Badge>(BADGES.map((b) => [b.id, b]));

/** Current progress toward each badge, used for the profile grid. */
export function badgeProgress(profile: ArenaProfile): Record<BadgeId, number> {
  const samples = Math.max(1, profile.categorySamples);
  const avg = (key: keyof ArenaProfile["categoryTotals"]) =>
    profile.categoryTotals[key] / samples;
  const bestPerspective = profile.perspectiveScores.length
    ? Math.max(...profile.perspectiveScores)
    : 0;

  return {
    "first-debate": Math.min(1, profile.debatesCompleted),
    "ten-debates": Math.min(10, profile.debatesCompleted),
    "evidence-builder": profile.categorySamples ? Math.round(avg("evidence")) : 0,
    "strong-rebuttal": profile.categorySamples ? Math.round(avg("rebuttal")) : 0,
    "perspective-master": Math.round(bestPerspective),
    "civil-challenger": profile.categorySamples ? Math.round(avg("civility")) : 0,
    "five-day-streak": Math.min(5, profile.streakDays),
    "underdog-win": profile.badges.some((b) => b.id === "underdog-win") ? 1 : 0,
    "perfect-civility": profile.badges.some((b) => b.id === "perfect-civility")
      ? 100
      : profile.categorySamples
        ? Math.round(avg("civility"))
        : 0,
    "switch-sides-10": Math.min(10, profile.switchSidesCompleted),
  };
}

/** Badges the profile now qualifies for but has not been awarded yet. */
export function newlyEarnedBadges(profile: ArenaProfile): BadgeId[] {
  const progress = badgeProgress(profile);
  const owned = new Set(profile.badges.map((b) => b.id));

  return BADGES.filter((badge) => {
    if (owned.has(badge.id)) return false;
    // Average-based badges need a minimum sample before they mean anything.
    const averageBased: BadgeId[] = [
      "evidence-builder",
      "strong-rebuttal",
      "civil-challenger",
    ];
    if (averageBased.includes(badge.id) && profile.debatesCompleted < 3) return false;
    return progress[badge.id] >= badge.target;
  }).map((b) => b.id);
}
