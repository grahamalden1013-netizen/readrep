import { z } from "zod";

/**
 * The coaching profile — collected once per coach, edited in Settings, reused
 * across every game. Enum answers only, no free text. Versioned so a future
 * question set can be migrated without losing old runs.
 *
 * `docs/ai-rep-copilot.md` (coaching-profile section) lists which answer feeds
 * which decision type; the same mapping is encoded in `influencesDecision()`.
 */
export const COACHING_PROFILE_VERSION = 1;

export type CoachingQuestion = {
  id: string;
  side: "offense" | "defense";
  prompt: string;
  /** Which decision situations this answer may inform. */
  appliesTo: DecisionTag[];
  options: { value: string; label: string }[];
};

export type DecisionTag =
  | "pace"
  | "transition-offense"
  | "shot-selection"
  | "paint-touch"
  | "drive-help"
  | "spacing"
  | "late-clock"
  | "offensive-rebound"
  | "on-ball-defense"
  | "help-defense"
  | "ball-screen-defense"
  | "switching"
  | "closeout"
  | "transition-defense"
  | "defensive-rebound";

const DEPENDS = { value: "depends", label: "It depends on personnel and clock" } as const;

export const COACHING_QUESTIONS: CoachingQuestion[] = [
  {
    id: "pace",
    side: "offense",
    prompt: "How do you want to play in the open floor?",
    appliesTo: ["pace", "transition-offense"],
    options: [
      { value: "push-always", label: "Push tempo on every possession" },
      { value: "push-advantage", label: "Push only with a numbers advantage" },
      { value: "controlled", label: "Controlled — get into offense" },
      DEPENDS,
    ],
  },
  {
    id: "transition_priority",
    side: "offense",
    prompt: "First look in transition?",
    appliesTo: ["transition-offense", "shot-selection"],
    options: [
      { value: "rim", label: "Attack the rim" },
      { value: "corner-three", label: "Drift to a corner three" },
      { value: "early-post", label: "Early post / mismatch" },
      { value: "flow", label: "Flow into a set" },
    ],
  },
  {
    id: "shot_profile",
    side: "offense",
    prompt: "Which shots do you want most?",
    appliesTo: ["shot-selection", "late-clock"],
    options: [
      { value: "rim-three", label: "Rim and threes only" },
      { value: "rim-ft-three", label: "Rim, free throws, threes" },
      { value: "best-available", label: "Best available look" },
      { value: "matchup", label: "Hunt a specific matchup" },
    ],
  },
  {
    id: "paint_touch",
    side: "offense",
    prompt: "Paint touches — how important?",
    appliesTo: ["paint-touch", "drive-help"],
    options: [
      { value: "required", label: "Required before a shot" },
      { value: "preferred", label: "Preferred, not required" },
      { value: "shot-first", label: "Take the open shot regardless" },
      DEPENDS,
    ],
  },
  {
    id: "drive_help",
    side: "offense",
    prompt: "When the low defender commits to the drive, what do you emphasize?",
    appliesTo: ["drive-help", "paint-touch", "spacing"],
    options: [
      { value: "finish", label: "Finish through the help" },
      { value: "simple-kick", label: "Make the simple kick-out" },
      { value: "skip", label: "Find the opposite-side skip" },
      DEPENDS,
    ],
  },
  {
    id: "spacing",
    side: "offense",
    prompt: "Off-ball spacing on a drive?",
    appliesTo: ["spacing", "drive-help"],
    options: [
      { value: "lift", label: "Lift to the ball" },
      { value: "hold-corners", label: "Hold the corners" },
      { value: "fill-behind", label: "Fill behind the drive" },
      { value: "read", label: "Read the help and relocate" },
    ],
  },
  {
    id: "late_clock",
    side: "offense",
    prompt: "Late-clock (under ~6s) approach?",
    appliesTo: ["late-clock", "shot-selection"],
    options: [
      { value: "best-shooter", label: "Ball to the best shooter" },
      { value: "attack-now", label: "Attack immediately" },
      { value: "any-good", label: "Any good look counts" },
      { value: "no-turnover", label: "Above all, no turnover" },
    ],
  },
  {
    id: "offensive_rebound",
    side: "offense",
    prompt: "Offensive-rebounding responsibility?",
    appliesTo: ["offensive-rebound", "transition-defense"],
    options: [
      { value: "crash-two", label: "Crash with two" },
      { value: "crash-designated", label: "Designated crashers only" },
      { value: "get-back", label: "Get back — protect transition" },
      DEPENDS,
    ],
  },
  {
    id: "on_ball_pressure",
    side: "defense",
    prompt: "On-ball pressure?",
    appliesTo: ["on-ball-defense"],
    options: [
      { value: "full-pressure", label: "Pressure and speed up the ball" },
      { value: "contain", label: "Contain, stay in front" },
      { value: "force-help", label: "Force toward help" },
      { value: "scout", label: "Follow the scouting plan" },
    ],
  },
  {
    id: "help_position",
    side: "defense",
    prompt: "Help positioning off the ball?",
    appliesTo: ["help-defense", "closeout"],
    options: [
      { value: "gap", label: "One pass away in the gap" },
      { value: "nail", label: "High help at the nail" },
      { value: "low-man", label: "Low man ready to tag / take the charge" },
      { value: "stay-attached", label: "Stay attached to shooters" },
    ],
  },
  {
    id: "ball_screen_coverage",
    side: "defense",
    prompt: "Base ball-screen coverage?",
    appliesTo: ["ball-screen-defense", "switching"],
    options: [
      { value: "drop", label: "Drop" },
      { value: "at-level", label: "At the level / hedge" },
      { value: "switch", label: "Switch 1–5" },
      { value: "personnel", label: "By personnel" },
    ],
  },
  {
    id: "switching",
    side: "defense",
    prompt: "Switching rules away from the ball?",
    appliesTo: ["switching", "ball-screen-defense"],
    options: [
      { value: "switch-all", label: "Switch everything on the perimeter" },
      { value: "switch-likes", label: "Switch like sizes only" },
      { value: "no-switch", label: "Fight through, no switch" },
      DEPENDS,
    ],
  },
  {
    id: "closeout",
    side: "defense",
    prompt: "On a closeout, what is the first priority?",
    appliesTo: ["closeout", "help-defense"],
    options: [
      { value: "prevent-shot", label: "Prevent the shot" },
      { value: "contain-drive", label: "Contain the drive" },
      { value: "force-help", label: "Force toward help" },
      { value: "scout", label: "Follow the matchup / scouting plan" },
    ],
  },
  {
    id: "transition_defense",
    side: "defense",
    prompt: "Transition-defense priority?",
    appliesTo: ["transition-defense", "defensive-rebound"],
    options: [
      { value: "protect-rim", label: "Protect the rim first" },
      { value: "stop-ball", label: "Stop the ball first" },
      { value: "match-up", label: "Match up and sprint" },
      { value: "no-threes", label: "Take away transition threes" },
    ],
  },
  {
    id: "defensive_rebound",
    side: "defense",
    prompt: "Defensive-rebounding responsibility?",
    appliesTo: ["defensive-rebound", "transition-defense"],
    options: [
      { value: "everyone-box", label: "Everyone boxes out" },
      { value: "bigs-guards-run", label: "Bigs rebound, guards leak out" },
      { value: "hit-and-get", label: "Hit and get to the ball" },
      DEPENDS,
    ],
  },
];

const answerValues = Object.fromEntries(
  COACHING_QUESTIONS.map((q) => [q.id, z.enum(q.options.map((o) => o.value) as [string, ...string[]])]),
);

/** A partial map is allowed — an unanswered question just means "no preference". */
export const coachingAnswersSchema = z.object(answerValues).partial();
export type CoachingAnswers = z.infer<typeof coachingAnswersSchema>;

export type CoachingProfile = {
  schemaVersion: number;
  answers: CoachingAnswers;
  completedAt: string | null;
};

export function isProfileComplete(profile: CoachingProfile | null): boolean {
  if (!profile) return false;
  // Complete = every question answered (a coach can still change any later).
  return COACHING_QUESTIONS.every((q) => typeof profile.answers[q.id] === "string");
}

/** Human-readable label for a stored answer, for Settings + "Why this moment?". */
export function answerLabel(questionId: string, value: string | undefined): string | null {
  if (!value) return null;
  const q = COACHING_QUESTIONS.find((x) => x.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? null;
}

/**
 * The relevant preferences for a decision, given tags the analyzer produced from
 * the *visible* situation. Only answered questions whose `appliesTo` intersects
 * the tags are returned — the model never receives a preference for a situation
 * it did not see, and a "depends" answer is treated as no preference.
 */
export function relevantPreferences(
  profile: CoachingProfile | null,
  decisionTags: DecisionTag[],
): { questionId: string; prompt: string; answer: string; label: string }[] {
  if (!profile) return [];
  const tags = new Set(decisionTags);
  return COACHING_QUESTIONS.flatMap((q) => {
    const answer = profile.answers[q.id];
    if (!answer || answer === "depends") return [];
    if (!q.appliesTo.some((t) => tags.has(t))) return [];
    const label = answerLabel(q.id, answer);
    return label ? [{ questionId: q.id, prompt: q.prompt, answer, label }] : [];
  });
}
