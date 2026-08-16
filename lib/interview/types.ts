import type { Action, Clock, Coverage, Phase, Role, TopicStatus } from "@/lib/interview/vocabulary";

/**
 * How ReadRep came to believe something.
 *
 * `confirmed` — the coach said it. `inferred` — ReadRep worked it out from
 * what they said plus general basketball context, and the coach has not
 * agreed. An inference never becomes "coach teaches this" without a
 * confirmation.
 */
export type Provenance = "confirmed" | "inferred";

/** One coached read, as stored. */
export type KnowledgeNode = {
  id: string;
  areaId: string;
  phase: Phase;
  action: Action | null;
  coverage: Coverage | null;
  role: Role | null;
  clock: Clock | null;
  trigger: string | null;
  instruction: string;
  priority: number;
  confidence: number;
  provenance: Provenance;
  confirmedAt: string | null;
  parentId: string | null;
  createdAt: string;
};

export type AreaState = {
  areaId: string;
  status: TopicStatus;
  confidence: number;
  note: string | null;
};

/** A gap that would change how ReadRep reads film if it were filled. */
export type Unknown = {
  id: string;
  areaId: string;
  question: string;
  whyItMatters: string | null;
  importance: number;
  createdAt: string;
};

/** A proposed replacement for something the coach already confirmed. */
export type RuleChange = {
  id: string;
  targetId: string;
  targetInstruction: string;
  targetScope: string;
  proposedInstruction: string;
  proposedTrigger: string | null;
  reason: string | null;
  createdAt: string;
};

export type InterviewTurn = {
  id: string;
  seq: number;
  role: "coach" | "assistant";
  content: string;
  areaId: string | null;
  reason: string | null;
  informationValue: "high" | "medium" | "low" | null;
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
};

/** Scratch state that guides the next question but isn't knowledge itself. */
export type InterviewScratch = {
  /** 2-4 short answers the coach can tap instead of typing. */
  suggestions: string[];
  nextAreaId: string | null;
  /** True once ReadRep has told the coach it has enough to work film. */
  endedAt: string | null;
};

export type Term = { id: string; term: string; meaning: string; category: string; origin: string };

/** Everything the interview engine reads before composing a turn. */
export type InterviewSnapshot = {
  playbookId: string;
  teamId: string;
  teamName: string;
  completedAt: string | null;
  knowledge: KnowledgeNode[];
  areaStates: AreaState[];
  turns: InterviewTurn[];
  terms: Term[];
  unknowns: Unknown[];
  ruleChanges: RuleChange[];
  scratch: InterviewScratch;
};
