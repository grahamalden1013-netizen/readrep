import type { Tag } from "@/lib/playbook/questions";

/**
 * ReadRep's canonical basketball knowledge framework.
 *
 * This is not a question list. It is the set of things that change how a
 * possession gets read, each with an honest estimate of how much it matters
 * and — crucially — how relevant it is *to this particular team*. A coach who
 * says they barely use ball screens shouldn't be interviewed about drop
 * coverage, and that decision is made here in code, not left to the model's
 * judgement.
 *
 * The AI never sees this file's structure as a syllabus to complete. It sees a
 * ranked shortlist of what would most improve film analysis right now.
 */

export type AreaGroup = "offense" | "defense" | "program";

/** Cheap, code-derived facts about the team's system. */
export type SystemSignals = {
  /** Confirmed knowledge + the coach's own words, lowercased. */
  text: string;
  ballScreens: "yes" | "no" | "unknown";
  playsZone: boolean;
  playsMan: boolean;
  postHeavy: boolean;
  switchHeavy: boolean;
};

export type Area = {
  id: string;
  group: AreaGroup;
  label: string;
  /** What ReadRep can do once this is known. Shown to the model verbatim. */
  filmUse: string;
  /** The facts that make this area genuinely usable. */
  needs: string[];
  /** 0-1: how much a film read changes when this is known. */
  filmImpact: number;
  /** Contribution to the readiness score, before relevance scaling. */
  weight: number;
  /** ReadRep cannot read film for this team without it. */
  essential: boolean;
  /**
   * Words that, appearing in the coach's own answers, mean this area has been
   * touched even if no structured fact landed in it. Drives indirect
   * redundancy detection.
   */
  evidence: string[];
  /** 0-1: how relevant this area is to THIS team's system. */
  relevance: (s: SystemSignals) => number;
  /** Retrieval tags, so film context can pull this area's knowledge. */
  tags: Tag[];
};

const always = () => 1;

export const AREAS: Area[] = [
  // --- Offense -------------------------------------------------------------
  {
    id: "offense.identity",
    group: "offense",
    label: "Offensive identity",
    filmUse:
      "Read a half-court possession against the right structure — alignment, pace, and what the offense is trying to create.",
    needs: ["Alignment", "Pace", "What they're trying to create"],
    filmImpact: 0.9,
    weight: 3,
    essential: true,
    evidence: ["5-out", "5 out", "four out", "4-out", "1-in", "motion", "spread", "pace", "fast", "push", "slow"],
    relevance: always,
    tags: ["identity", "offense", "half_court", "pace"],
  },
  {
    id: "offense.principles",
    group: "offense",
    label: "Offensive principles",
    filmUse:
      "Tell a bad decision from bad spacing around it — where players stand, and what they do when the ball is driven.",
    needs: ["Spacing rule", "What off-ball players do on a drive"],
    filmImpact: 0.85,
    weight: 3,
    essential: false,
    evidence: ["spacing", "gap", "gaps", "paint touch", "corner", "drift", "lift", "relocate", "cut", "space"],
    relevance: always,
    tags: ["spacing", "off_ball", "drive_kick", "paint_touch", "cutting", "offense"],
  },
  {
    id: "offense.actions",
    group: "offense",
    label: "Actions they run",
    filmUse: "Recognise the set or action a possession is running instead of describing it generically.",
    needs: ["The actions they flow into", "What they want to get to first"],
    filmImpact: 0.7,
    weight: 2,
    essential: false,
    evidence: ["zoom", "horns", "chicago", "spain", "flow", "flare", "pin", "handoff", "dho", "stagger", "ram"],
    relevance: always,
    tags: ["offense", "screening", "half_court"],
  },
  {
    id: "offense.ball_screen_reads",
    group: "offense",
    label: "Ball-screen reads",
    filmUse: "Grade the ball handler's and screener's decisions against the coverage the defense actually played.",
    needs: ["First read vs the common coverages", "What changes when the help commits"],
    filmImpact: 0.9,
    weight: 3,
    essential: false,
    evidence: ["ball screen", "pick and roll", "p&r", "pnr", "drop", "roller", "turn the corner", "reject", "short roll", "pop"],
    relevance: (s) => (s.ballScreens === "yes" ? 1 : s.ballScreens === "no" ? 0.05 : 0.6),
    tags: ["ball_screen", "screening", "offense"],
  },
  {
    id: "offense.post_reads",
    group: "offense",
    label: "Post play",
    filmUse: "Grade post entries, post decisions, and how the other four play around a post touch.",
    needs: ["How they get the post the ball", "What the post reads on help"],
    filmImpact: 0.8,
    weight: 2,
    essential: false,
    evidence: ["post", "block", "duck in", "seal", "inside out", "double team", "high-low"],
    relevance: (s) => (s.postHeavy ? 1 : s.text.includes("no post") ? 0.05 : 0.3),
    tags: ["post", "offense"],
  },
  {
    id: "offense.shot_selection",
    group: "offense",
    label: "Shot selection",
    filmUse:
      "The single biggest input to grading a decision — which shots this coach calls good and which they call bad.",
    needs: ["Shots they want", "Shots they don't want"],
    filmImpact: 0.95,
    weight: 3,
    essential: true,
    evidence: ["shot", "three", "contested", "rim", "layup", "free throw", "hunt", "green light", "quick"],
    relevance: always,
    tags: ["shot_selection", "offense", "late_clock"],
  },
  {
    id: "offense.transition",
    group: "offense",
    label: "Transition offense",
    filmUse: "Judge whether pushing or pulling it out was the right call.",
    needs: ["When to push", "The first transition look"],
    filmImpact: 0.5,
    weight: 1.5,
    essential: false,
    evidence: ["transition", "push", "run", "break", "leak", "drag", "early offense"],
    relevance: always,
    tags: ["transition", "pace", "offense"],
  },

  // --- Defense -------------------------------------------------------------
  {
    id: "defense.identity",
    group: "defense",
    label: "Defensive identity",
    filmUse: "Read a defensive possession against the right structure and know what they're trying to take away.",
    needs: ["Man, zone, or mixed", "What they take away first"],
    filmImpact: 0.9,
    weight: 3,
    essential: true,
    evidence: ["man to man", "man-to-man", "zone", "press", "2-3", "1-3-1", "pack", "no middle", "force baseline"],
    relevance: always,
    tags: ["defense", "priorities"],
  },
  {
    id: "defense.principles",
    group: "defense",
    label: "Help & rotation",
    filmUse: "Decide whether a defender was in the right place — where help comes from and who covers behind it.",
    needs: ["Where help comes from", "Who rotates behind"],
    filmImpact: 0.85,
    weight: 3,
    essential: false,
    evidence: ["help", "nail", "low man", "rotate", "rotation", "gap", "stunt", "dig", "closeout", "shell"],
    relevance: (s) => (s.playsMan ? 1 : s.playsZone ? 0.5 : 0.8),
    tags: ["help", "rotation", "closeout", "defense"],
  },
  {
    id: "defense.ball_screen_coverage",
    group: "defense",
    label: "Ball-screen defense",
    filmUse: "Judge each defender's job on a screen — and later, notice when film shows a coverage ReadRep hasn't been taught.",
    needs: ["Default coverage", "Each defender's job in it", "Exceptions"],
    filmImpact: 0.85,
    weight: 2.5,
    essential: false,
    evidence: ["drop", "ice", "blue", "hedge", "blitz", "switch", "under", "over", "trap", "scram"],
    relevance: (s) => (s.playsZone && !s.playsMan ? 0.2 : 1),
    tags: ["defensive_ball_screen", "ball_screen", "switching", "defense"],
  },
  {
    id: "defense.zone",
    group: "defense",
    label: "Zone principles",
    filmUse: "Read a zone possession — high post, short corner, baseline coverage, and when they change defenses.",
    needs: ["Which zone", "The key responsibility inside it", "When they go to it"],
    filmImpact: 0.7,
    weight: 2,
    essential: false,
    evidence: ["zone", "2-3", "3-2", "1-3-1", "matchup zone", "short corner", "high post"],
    relevance: (s) => (s.playsZone ? 1 : 0.05),
    tags: ["zone", "defense"],
  },
  {
    id: "defense.transition",
    group: "defense",
    label: "Transition defense",
    filmUse: "Judge the first job on a live-ball change of possession.",
    needs: ["First priority getting back", "Who takes the ball"],
    filmImpact: 0.5,
    weight: 1.5,
    essential: false,
    evidence: ["get back", "transition defense", "build the wall", "protect the rim", "match up", "sprint back"],
    relevance: always,
    tags: ["transition_defense", "defense"],
  },

  // --- Program -------------------------------------------------------------
  {
    id: "program.priorities",
    group: "program",
    label: "Coaching priorities",
    filmUse:
      "Pick which moments are worth teaching, and correct them in the order this coach would — not a generic clinic order.",
    needs: ["What they stop film for", "What they let go"],
    filmImpact: 0.9,
    weight: 3,
    essential: true,
    evidence: ["drives me crazy", "stop film", "harp on", "priority", "emphasis", "correct", "repeat", "hate"],
    relevance: always,
    tags: ["priorities"],
  },
  {
    id: "program.decision_vs_outcome",
    group: "program",
    label: "Decision vs. outcome",
    filmUse:
      "Calibrate the whole feedback voice — whether a right read that missed is praised or corrected.",
    needs: ["How they treat a good read that missed", "How they treat a bad read that scored"],
    filmImpact: 0.8,
    weight: 2,
    essential: false,
    evidence: ["right read", "good decision", "process", "result", "outcome", "made it", "missed"],
    relevance: always,
    tags: ["priorities", "development"],
  },
  {
    id: "program.language",
    group: "program",
    label: "Their language",
    filmUse: "Say 'Chicago' instead of 'pin-down into a handoff' when feedback goes to a player.",
    needs: ["A few team-specific terms with meanings"],
    filmImpact: 0.4,
    weight: 1,
    essential: false,
    evidence: [],
    relevance: always,
    tags: ["development", "identity"],
  },
];

export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));

export function isKnownArea(id: string): boolean {
  return AREA_BY_ID.has(id);
}

export function areaLabel(id: string): string {
  return AREA_BY_ID.get(id)?.label ?? id;
}

export const GROUP_LABELS: Record<AreaGroup, string> = {
  offense: "Offense",
  defense: "Defense",
  program: "Program",
};

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

/**
 * Reads the team's system out of what the coach has actually said.
 *
 * Deliberately coarse and keyword-driven: these signals only decide which
 * areas are worth a coach's time, and a wrong guess costs at most one skipped
 * question that the coach can raise themselves. Negations are checked first
 * because "we barely use ball screens" must not read as "uses ball screens".
 */
export function deriveSignals(text: string): SystemSignals {
  const t = text.toLowerCase();

  const deniesBallScreens = has(
    t,
    "no ball screen",
    "don't use ball screen",
    "dont use ball screen",
    "barely use ball screen",
    "rarely use ball screen",
    "don't run ball screen",
    "dont run ball screen",
    "we don't ball screen",
    "not a ball screen team",
    "minimal ball screen",
  );
  const mentionsBallScreens = has(t, "ball screen", "pick and roll", "pick-and-roll", "p&r", "pnr", "side screen", "roller");

  const playsZone = has(t, "zone", "2-3", "3-2", "1-3-1", "matchup zone") && !has(t, "no zone", "never zone");
  const playsMan = has(t, "man to man", "man-to-man", "man defense", "we play man", "mostly man", "switch");

  return {
    text: t,
    ballScreens: deniesBallScreens ? "no" : mentionsBallScreens ? "yes" : "unknown",
    playsZone,
    playsMan,
    postHeavy: has(t, "post heavy", "through our post", "through the post", "4-out-1-in", "4 out 1 in", "1-in", "post up", "our five", "our 5 "),
    switchHeavy: has(t, "switch everything", "switch 1", "switch all", "switch most"),
  };
}
