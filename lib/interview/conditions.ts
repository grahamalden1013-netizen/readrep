import {
  ACTIONS,
  CLOCKS,
  COVERAGES,
  ROLES,
  type Action,
  type Clock,
  type Coverage,
  type Phase,
  type Role,
} from "@/lib/interview/vocabulary";

/**
 * Free-text basketball conditions → ReadRep's closed situation vocabulary.
 *
 * This is the half of the contract that used to live in the Anthropic grammar
 * as five nullable enums repeated across every array slot. Moving it here made
 * the compiled grammar small enough to accept, and it is a better home for it
 * anyway: synonyms are a basketball problem, they change as coaches use new
 * language, and they belong somewhere we can test and correct without
 * touching the model contract.
 *
 * The model now says what it means in plain English — "vs drop", "the low man",
 * "if the big commits to the ball" — and this maps it onto the same columns as
 * before. Anything it can't place becomes a `trigger`, which is where genuinely
 * conditional coaching language belongs.
 */

export type ParsedScope = {
  action: Action | null;
  coverage: Coverage | null;
  role: Role | null;
  clock: Clock | null;
  /** Conditional language: "the big commits to the ball". */
  trigger: string | null;
  /** Conditions that matched nothing — kept so nothing is silently lost. */
  unmatched: string[];
};

/**
 * Longest phrase first within each group: "no middle" must not be eaten by a
 * later "middle", and "weak side defender" must beat "weak side".
 */
const COVERAGE_TERMS: [string, Coverage][] = [
  ["drop coverage", "drop"],
  ["in drop", "drop"],
  ["drop", "drop"],
  ["switch everything", "switch"],
  ["switched", "switch"],
  ["switch", "switch"],
  ["hard hedge", "hedge"],
  ["hedge", "hedge"],
  ["show", "hedge"],
  ["blitz", "blitz"],
  ["trap", "blitz"],
  ["double the ball", "blitz"],
  ["ice", "ice"],
  ["blue", "ice"],
  ["push it down", "ice"],
  ["force baseline", "ice"],
  ["go under", "under"],
  ["under", "under"],
  ["go over", "over"],
  ["over the top", "over"],
  ["over", "over"],
];

const ACTION_TERMS: [string, Action][] = [
  ["side ball screen", "ball_screen"],
  ["middle ball screen", "ball_screen"],
  ["step-up screen", "ball_screen"],
  ["ball screen", "ball_screen"],
  ["ball-screen", "ball_screen"],
  ["pick and roll", "ball_screen"],
  ["pick-and-roll", "ball_screen"],
  ["p&r", "ball_screen"],
  ["pnr", "ball_screen"],
  ["drag screen", "ball_screen"],
  ["transition", "transition"],
  ["fast break", "transition"],
  ["early offense", "transition"],
  ["post up", "post"],
  ["post touch", "post"],
  ["post entry", "post"],
  ["in the post", "post"],
  ["post", "post"],
  ["drive and kick", "drive_kick"],
  ["drive & kick", "drive_kick"],
  ["paint touch", "drive_kick"],
  ["baseline drive", "drive_kick"],
  ["penetration", "drive_kick"],
  ["on a drive", "drive_kick"],
  ["half court", "half_court"],
  ["half-court", "half_court"],
  ["off ball", "off_ball"],
  ["off-ball", "off_ball"],
  ["away from the ball", "off_ball"],
];

/**
 * Roles are phase-sensitive: "weak side" means an offensive spacer on offense
 * and a helpside defender on defense. The phase decides.
 */
const OFFENSE_ROLE_TERMS: [string, Role][] = [
  ["ball handler", "ball_handler"],
  ["ball-handler", "ball_handler"],
  ["the guard", "ball_handler"],
  ["guards", "ball_handler"],
  ["screener", "screener"],
  ["the roller", "screener"],
  ["roller", "screener"],
  ["the big", "screener"],
  ["weak side", "off_ball"],
  ["weak-side", "off_ball"],
  ["off ball", "off_ball"],
  ["corner", "off_ball"],
  ["spacers", "off_ball"],
];

const DEFENSE_ROLE_TERMS: [string, Role][] = [
  ["on-ball defender", "on_ball"],
  ["on ball defender", "on_ball"],
  ["on the ball", "on_ball"],
  ["screener's defender", "screener_def"],
  ["screeners defender", "screener_def"],
  ["big's defender", "screener_def"],
  ["the big", "screener_def"],
  ["low man", "low_man"],
  ["lowman", "low_man"],
  ["tagger", "low_man"],
  ["weak side defender", "weak_side"],
  ["weak-side defender", "weak_side"],
  ["weak side", "weak_side"],
  ["helpside", "weak_side"],
  ["help side", "weak_side"],
  ["nail", "weak_side"],
];

const CLOCK_TERMS: [string, Clock][] = [
  ["late clock", "late"],
  ["late in the clock", "late"],
  ["shot clock is short", "late"],
  ["end of clock", "late"],
  ["late", "late"],
  ["early clock", "early"],
  ["early in the clock", "early"],
  ["early", "early"],
];

/** Phrases that mark a condition as a trigger rather than a scope. */
const TRIGGER_PREFIXES = ["if ", "when ", "once ", "whenever ", "unless "];

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function firstMatch<T extends string>(text: string, terms: [string, T][]): T | null {
  for (const [phrase, value] of terms) {
    if (text.includes(phrase)) return value;
  }
  return null;
}

const inVocabulary = <T extends string>(list: readonly T[], value: string): T | null =>
  (list as readonly string[]).includes(value) ? (value as T) : null;

const OFFENSE_ROLES: Role[] = ["ball_handler", "screener", "off_ball"];
const DEFENSE_ROLES: Role[] = ["on_ball", "screener_def", "low_man", "weak_side"];

/** A role only counts when it belongs to this side of the ball. */
function phaseAllows(phase: Phase, role: Role | null): Role | null {
  if (!role) return null;
  if (phase === "offense") return OFFENSE_ROLES.includes(role) ? role : null;
  if (phase === "defense") return DEFENSE_ROLES.includes(role) ? role : null;
  return null;
}

/**
 * Maps one turn's condition phrases onto a situation.
 *
 * Deliberately forgiving: a condition that matches nothing is preserved rather
 * than dropped, so a coach's own phrasing never disappears silently.
 */
export function parseConditions(conditions: string[], phase: Phase): ParsedScope {
  const scope: ParsedScope = {
    action: null,
    coverage: null,
    role: null,
    clock: null,
    trigger: null,
    unmatched: [],
  };

  const roleTerms = phase === "defense" ? DEFENSE_ROLE_TERMS : OFFENSE_ROLE_TERMS;
  const triggers: string[] = [];

  for (const raw of conditions) {
    const text = normalise(raw);
    if (!text) continue;

    // Conditional language is a trigger, not a scope — "if the big commits"
    // is the branch condition on a read, not a dimension of the situation.
    if (TRIGGER_PREFIXES.some((p) => text.startsWith(p))) {
      triggers.push(raw.replace(/^\s*(if|when|once|whenever|unless)\s+/i, "").trim());
      continue;
    }

    let matched = false;

    // A bare enum value straight from ReadRep's vocabulary is taken as-is —
    // except for roles, which are phase-sensitive: "weak side" is an offensive
    // spacer and a defensive helper, and only the phase can tell them apart.
    const snake = text.replace(/ /g, "_");
    const directCoverage = inVocabulary(COVERAGES, text);
    const directAction = inVocabulary(ACTIONS, snake);
    const directClock = inVocabulary(CLOCKS, text);
    const directRole = phaseAllows(phase, inVocabulary(ROLES, snake));

    if (directCoverage || directAction || directClock || directRole) {
      if (directCoverage) scope.coverage ??= directCoverage;
      if (directAction) scope.action ??= directAction;
      if (directClock) scope.clock ??= directClock;
      if (directRole) scope.role ??= directRole;
      continue;
    }

    const coverage = firstMatch(text, COVERAGE_TERMS);
    if (coverage && scope.coverage === null) {
      scope.coverage = coverage;
      matched = true;
    }

    const action = firstMatch(text, ACTION_TERMS);
    if (action && scope.action === null) {
      scope.action = action;
      matched = true;
    }

    const role = firstMatch(text, roleTerms);
    if (role && scope.role === null) {
      scope.role = role;
      matched = true;
    }

    const clock = firstMatch(text, CLOCK_TERMS);
    if (clock && scope.clock === null) {
      scope.clock = clock;
      matched = true;
    }

    if (!matched) scope.unmatched.push(raw.trim());
  }

  // A coverage only means anything on a ball screen.
  if (scope.coverage && scope.action === null) scope.action = "ball_screen";

  // Unmatched phrases are still coaching language: keep them as the trigger
  // rather than discarding what the coach actually said.
  const allTriggers = [...triggers, ...scope.unmatched];
  scope.trigger = allTriggers.length > 0 ? allTriggers.join("; ") : null;

  return scope;
}

/**
 * Guesses a terminology category from the term's meaning, replacing what used
 * to be a seven-member enum in the grammar.
 */
export function categoriseTerm(term: string, meaning: string): string {
  const text = normalise(`${term} ${meaning}`);
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  if (has("screen", "pin", "handoff", "dho", "flare", "back screen")) return "screening";
  if (has("spacing", "corner", "space", "lift", "drift", "gap")) return "spacing";
  if (has("transition", "break", "push", "run", "leak")) return "transition";
  if (has("defen", "coverage", "guard", "help", "closeout", "zone", "switch")) return "defense";
  if (has("guard", "wing", "big", "post", "five", "four")) return "personnel";
  if (has("offen", "cut", "action", "set", "motion", "score")) return "offense";
  return "other";
}
