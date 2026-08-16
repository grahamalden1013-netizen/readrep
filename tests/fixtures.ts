import type { InterviewTurnOutput } from "@/lib/ai/schemas";
import type { InterviewSnapshot, KnowledgeNode, Unknown } from "@/lib/interview/types";

/** Shared fixtures so every test builds the same shapes the app builds. */

export function snapshot(overrides: Partial<InterviewSnapshot> = {}): InterviewSnapshot {
  return {
    playbookId: "pb-1",
    teamId: "team-1",
    teamName: "Riverside 15U",
    completedAt: null,
    knowledge: [],
    areaStates: [],
    turns: [],
    terms: [],
    unknowns: [],
    ruleChanges: [],
    scratch: { suggestions: [], nextAreaId: null, endedAt: null },
    ...overrides,
  };
}

export function node(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: `k-${Math.random().toString(36).slice(2, 8)}`,
    areaId: "offense.identity",
    phase: "offense",
    action: null,
    coverage: null,
    role: null,
    clock: null,
    trigger: null,
    instruction: "5-out motion",
    priority: 1,
    confidence: 0.9,
    provenance: "confirmed",
    confirmedAt: "2026-01-01T00:00:00Z",
    parentId: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function unknown(overrides: Partial<Unknown> = {}): Unknown {
  return {
    id: `u-${Math.random().toString(36).slice(2, 8)}`,
    areaId: "offense.principles",
    question: "On baseline penetration, does the weak-side corner drift, lift, or hold?",
    whyItMatters: "Changes whether a skip pass was the right read.",
    importance: 0.6,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function turnOutput(overrides: Partial<InterviewTurnOutput> = {}): InterviewTurnOutput {
  return {
    assistant_message: "How do you want your team to defend?",
    confirmed_knowledge_updates: [],
    inferred_knowledge_updates: [],
    updated_knowledge: [],
    confirmed_inferences: [],
    terminology_detected: [],
    knowledge_conflicts: [],
    important_unknowns: [],
    resolved_unknowns: [],
    coverage_updates: [],
    film_readiness: { status: "learning", reason: "Still learning." },
    next_question_area: "defense.identity",
    next_question_information_value: "high",
    reason_question_is_needed: "Nothing known about defense yet.",
    suggested_answers: [],
    should_end_onboarding: false,
    ...overrides,
  };
}

export function outputNode(
  overrides: Partial<InterviewTurnOutput["confirmed_knowledge_updates"][number]> = {},
): InterviewTurnOutput["confirmed_knowledge_updates"][number] {
  return {
    ref: "r1",
    area_id: "offense.identity",
    phase: "offense",
    action: null,
    coverage: null,
    role: null,
    clock: null,
    trigger: null,
    instruction: "5-out motion",
    priority: 1,
    confidence: 0.95,
    parent_ref: null,
    ...overrides,
  };
}

/** The full set of facts the brief's example answer should produce. */
export const RICH_ANSWER =
  "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes.";

export const RICH_ANSWER_FACTS: InterviewTurnOutput["confirmed_knowledge_updates"] = [
  outputNode({ ref: "align", area_id: "offense.identity", instruction: "5-out alignment" }),
  outputNode({ ref: "pace", area_id: "offense.identity", instruction: "play fast", priority: 2 }),
  outputNode({ ref: "gaps", area_id: "offense.principles", instruction: "attack gaps" }),
  outputNode({ ref: "zoom", area_id: "offense.actions", instruction: "flow into Zoom" }),
  outputNode({ ref: "sidepnr", area_id: "offense.actions", instruction: "flow into side ball screens", priority: 2 }),
  outputNode({
    ref: "drop",
    area_id: "offense.ball_screen_reads",
    action: "ball_screen",
    coverage: "drop",
    role: "ball_handler",
    instruction: "get downhill",
  }),
  outputNode({
    ref: "shots",
    area_id: "offense.shot_selection",
    instruction: "no early contested threes",
  }),
];
