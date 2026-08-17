import type { InterviewTurnOutput, KnowledgeUpdateOutput } from "@/lib/ai/schemas";
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
    concept: "alignment",
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
    whyItMatters: null,
    importance: 0.6,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function turnOutput(overrides: Partial<InterviewTurnOutput> = {}): InterviewTurnOutput {
  return {
    assistant_message: "How do you want your team to defend?",
    knowledge_updates: [],
    unknowns: [],
    terminology: [],
    conflicts: [],
    areas_not_applicable: [],
    film_readiness: "learning",
    next_question: {
      area: "defense.identity",
      information_value: "high",
      reason: "Nothing known about defense yet.",
    },
    suggested_answers: [],
    should_end_onboarding: false,
    ...overrides,
  };
}

export function fact(overrides: Partial<KnowledgeUpdateOutput> = {}): KnowledgeUpdateOutput {
  return {
    op: "add",
    area: "offense.identity",
    concept: "alignment",
    value: "5-out",
    provenance: "confirmed",
    confidence: 0.95,
    conditions: [],
    target_id: null,
    replaces_confirmed_rule: false,
    ...overrides,
  };
}

/** The brief's example answer, and what one turn should get out of it. */
export const RICH_ANSWER =
  "We're mostly 5-out. We want to play fast, attack gaps, and if nothing is there we flow into Zoom or side ball screens. Against drop I want my guards getting downhill. I hate early contested threes.";

export const RICH_ANSWER_FACTS: KnowledgeUpdateOutput[] = [
  fact({ area: "offense.identity", concept: "alignment", value: "5-out" }),
  fact({ area: "offense.identity", concept: "pace", value: "play fast" }),
  fact({ area: "offense.principles", concept: "principle", value: "attack gaps" }),
  fact({ area: "offense.actions", concept: "action", value: "Zoom" }),
  fact({ area: "offense.actions", concept: "action", value: "side ball screens" }),
  fact({
    area: "offense.ball_screen_reads",
    concept: "first read",
    value: "get downhill",
    conditions: ["side ball screen", "vs drop", "ball handler"],
  }),
  fact({
    area: "offense.shot_selection",
    concept: "shot they don't want",
    value: "early contested threes",
  }),
];
