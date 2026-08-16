import type { Action, Clock, Coverage, Phase, Role, TopicStatus } from "@/lib/interview/vocabulary";

/** One coached read, as stored. */
export type KnowledgeNode = {
  id: string;
  topicId: string;
  phase: Phase;
  action: Action | null;
  coverage: Coverage | null;
  role: Role | null;
  clock: Clock | null;
  trigger: string | null;
  instruction: string;
  priority: number;
  confidence: number;
  source: "coach" | "inferred";
  parentId: string | null;
  createdAt: string;
};

export type TopicState = {
  topicId: string;
  status: TopicStatus;
  confidence: number;
  note: string | null;
};

export type InterviewTurn = {
  id: string;
  seq: number;
  role: "coach" | "assistant";
  content: string;
  topicId: string | null;
  reason: string | null;
  createdAt: string;
};

/** Scratch state that guides the next question but isn't knowledge itself. */
export type InterviewScratch = {
  ambiguities: string[];
  nextTopicId: string | null;
};

export type Term = { id: string; term: string; meaning: string; category: string };

/** Everything the interview engine reads before composing a turn. */
export type InterviewSnapshot = {
  playbookId: string;
  teamId: string;
  teamName: string;
  completedAt: string | null;
  knowledge: KnowledgeNode[];
  topicStates: TopicState[];
  turns: InterviewTurn[];
  terms: Term[];
  scratch: InterviewScratch;
};
