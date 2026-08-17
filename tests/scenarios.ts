import type { InterviewSnapshot, KnowledgeNode, Unknown } from "@/lib/interview/types";

/**
 * Deterministic interview states, for testing readiness and question selection
 * without touching the API.
 *
 * Each scenario is what the engine would actually be holding after N answers
 * from a given kind of coach: the facts spread across areas the way a real
 * extraction spreads them, and the coach's own words in the transcript so the
 * adaptive relevance signals ("we barely use ball screens", "2-3 zone") fire
 * exactly as they do in production.
 */

let seq = 0;

export function knowledge(
  areaId: string,
  count: number,
  overrides: Partial<KnowledgeNode> = {},
): KnowledgeNode[] {
  const phase = areaId.startsWith("defense")
    ? ("defense" as const)
    : areaId.startsWith("program")
      ? ("coaching" as const)
      : ("offense" as const);

  return Array.from({ length: count }, (_, i) => ({
    id: `k${(seq += 1)}`,
    areaId,
    concept: `concept-${i + 1}`,
    phase,
    action: null,
    coverage: null,
    role: null,
    clock: null,
    trigger: null,
    instruction: `${areaId} fact ${i + 1}`,
    priority: i + 1,
    confidence: 0.9,
    provenance: "confirmed" as const,
    confirmedAt: "2026-01-01T00:00:00Z",
    parentId: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }));
}

/** Builds the turn list from the coach's answers, one question each. */
function transcript(answers: string[]) {
  return answers.flatMap((content, i) => [
    {
      id: `a${i}`,
      seq: i * 2,
      role: "assistant" as const,
      content: "…",
      areaId: null,
      reason: null,
      informationValue: null,
      model: null,
      promptVersion: null,
      createdAt: "",
    },
    {
      id: `c${i}`,
      seq: i * 2 + 1,
      role: "coach" as const,
      content,
      areaId: null,
      reason: null,
      informationValue: null,
      model: null,
      promptVersion: null,
      createdAt: "",
    },
  ]);
}

export function scenario(opts: {
  answers: string[];
  covered: Record<string, number>;
  unknowns?: Unknown[];
  notApplicable?: string[];
}): InterviewSnapshot {
  return {
    playbookId: "sc",
    teamId: "sc",
    teamName: "Scenario",
    completedAt: null,
    knowledge: Object.entries(opts.covered).flatMap(([areaId, n]) => knowledge(areaId, n)),
    areaStates: (opts.notApplicable ?? []).map((areaId) => ({
      areaId,
      status: "not_applicable" as const,
      confidence: 0,
      note: null,
    })),
    turns: transcript(opts.answers),
    terms: [],
    unknowns: opts.unknowns ?? [],
    ruleChanges: [],
    scratch: { suggestions: [], nextAreaId: null, endedAt: null },
  };
}

export function gap(areaId: string, importance: number, question = "a gap"): Unknown {
  return {
    id: `u${(seq += 1)}`,
    areaId,
    question,
    whyItMatters: null,
    importance,
    createdAt: "",
  };
}

// ---------------------------------------------------------------------------
// A — detailed 5-out / P&R coach. Three rich answers, the kind that name
//     alignment, pace, principles, actions, a read and a shot standard at once.
// ---------------------------------------------------------------------------
export const DETAILED_ANSWERS = [
  "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes.",
  "Man to man, and we switch 1 through 4. We're taking away the paint first — help comes from the nail, low man rotates to the roller, weak side stunts and recovers.",
  "I stop film for two things: no paint touch on a possession, and not sprinting back in transition. I can live with a turnover if we were being aggressive.",
];

export const detailedCoach = () =>
  scenario({
    answers: DETAILED_ANSWERS,
    covered: {
      "offense.identity": 2,
      "offense.principles": 1,
      "offense.actions": 2,
      "offense.ball_screen_reads": 1,
      "offense.shot_selection": 1,
      "defense.identity": 2,
      "defense.principles": 2,
      "defense.ball_screen_coverage": 1,
      "program.priorities": 2,
    },
  });

/** The same coach one answer in — should not be ready yet. */
export const detailedCoachEarly = () =>
  scenario({
    answers: [DETAILED_ANSWERS[0]],
    covered: {
      "offense.identity": 2,
      "offense.principles": 1,
      "offense.actions": 2,
      "offense.ball_screen_reads": 1,
      "offense.shot_selection": 1,
    },
  });

// ---------------------------------------------------------------------------
// B — terse coach. Ten answers of two or three words each, so far less lands
//     per answer and several core areas are still thin.
// ---------------------------------------------------------------------------
export const terseCoach = () =>
  scenario({
    answers: [
      "5-out.",
      "Fast.",
      "Mostly man.",
      "We switch.",
      "Get downhill.",
      "Good ones.",
      "Effort.",
      "Stay spaced.",
      "Help from the top.",
      "The read.",
    ],
    covered: {
      "offense.identity": 1,
      "offense.shot_selection": 1,
      "defense.identity": 1,
      "program.priorities": 1,
    },
  });

// ---------------------------------------------------------------------------
// C — post-heavy, non-P&R coach. Ball-screen areas must never be asked about,
//     and must not hold readiness back.
// ---------------------------------------------------------------------------
export const postCoach = () =>
  scenario({
    answers: [
      "We're 4-out-1-in and everything runs through our post. We barely use ball screens — we'd rather get a touch on the block and play off it.",
      "We enter from the wing on a high-low or off a cut. Single cover, he scores. If they dig from the top, he kicks to the skip and we play inside-out.",
      "Man to man. We pack the paint and make teams shoot over us. Help comes from the weak-side wing.",
      "Not looking inside. If the post is sealed and we swing it around, I'm stopping the film.",
    ],
    covered: {
      "offense.identity": 2,
      "offense.principles": 1,
      "offense.actions": 1,
      "offense.post_reads": 2,
      "offense.shot_selection": 1,
      "defense.identity": 2,
      "defense.principles": 1,
      "defense.ball_screen_coverage": 1,
      "program.priorities": 1,
    },
  });

// ---------------------------------------------------------------------------
// D — zone-heavy coach. Zone principles must be in play; man-only help detail
//     matters less; ball-screen defense should barely register.
// ---------------------------------------------------------------------------
export const zoneCoach = () =>
  scenario({
    answers: [
      "We sit in a 2-3 zone almost every possession, and we go man in the last four minutes.",
      "Top two take away the middle. Ball-side wing has the short corner, middle covers the high post, weak-side wing has to be at the rim on the skip.",
      "We're 4-out, normal pace, and we want the ball reversed twice before we shoot.",
      "Ball watching in the zone. And not rebounding out of it.",
    ],
    covered: {
      "offense.identity": 2,
      "offense.principles": 1,
      "offense.actions": 1,
      "offense.shot_selection": 1,
      "defense.identity": 2,
      "defense.zone": 2,
      "defense.principles": 1,
      "program.priorities": 1,
    },
  });

/** Counts occurrences, for rebuilding a `covered` map during a simulated walk. */
export function countBy(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
}
