import { computeCoverage } from "@/lib/interview/coverage";
import { TOPIC_BY_ID } from "@/lib/interview/coverage-model";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type { InterviewSnapshot, InterviewTurn, Term } from "@/lib/interview/types";
import { PHASE_LABELS, type Phase } from "@/lib/interview/vocabulary";

/**
 * A plain, serializable projection of the interview for client components.
 *
 * The coverage model carries predicate functions, which cannot cross the
 * server/client boundary — this flattens everything the learning panel needs
 * into data, and nothing more.
 */

const PHASE_ORDER: Record<Phase, number> = { team: 0, offense: 1, defense: 2, coaching: 3 };

export type TopicView = {
  id: string;
  label: string;
  phase: Phase;
  phaseLabel: string;
  goal: string;
  status: "unknown" | "partial" | "covered" | "not_applicable";
  confidence: number;
  nodeCount: number;
  filmCritical: boolean;
  applicable: boolean;
};

export type ReadView = {
  id: string;
  topicLabel: string;
  phase: Phase;
  scope: string;
  text: string;
  source: "coach" | "inferred";
  confidence: number;
  priority: number;
  children: { id: string; text: string }[];
};

export type InterviewView = {
  teamId: string;
  teamName: string;
  turns: InterviewTurn[];
  topics: TopicView[];
  reads: ReadView[];
  terms: Term[];
  ambiguities: string[];
  nextTopicLabel: string | null;
  overall: number;
  filmReady: boolean;
  missingCritical: string[];
  knowledgeCount: number;
};

export function toInterviewView(snapshot: InterviewSnapshot): InterviewView {
  const coverage = computeCoverage(snapshot);

  const childrenOf = new Map<string, { id: string; text: string }[]>();
  for (const node of snapshot.knowledge) {
    if (!node.parentId) continue;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push({ id: node.id, text: describeNode(node) });
    childrenOf.set(node.parentId, list);
  }

  const reads: ReadView[] = snapshot.knowledge
    .filter((n) => !n.parentId)
    .map((node) => ({
      id: node.id,
      topicLabel: TOPIC_BY_ID.get(node.topicId)?.label ?? node.topicId,
      phase: node.phase,
      scope: describeScope(node),
      text: describeNode(node),
      source: node.source,
      confidence: node.confidence,
      priority: node.priority,
      children: childrenOf.get(node.id) ?? [],
    }))
    // Read the way a coach would: team first, then offense, defense, and how
    // they coach — and within a topic, in the order the reads happen.
    .sort((a, b) => {
      if (a.phase !== b.phase) return PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
      if (a.topicLabel !== b.topicLabel) return a.topicLabel.localeCompare(b.topicLabel);
      return a.priority - b.priority;
    });

  return {
    teamId: snapshot.teamId,
    teamName: snapshot.teamName,
    turns: snapshot.turns,
    topics: coverage.topics.map((t) => ({
      id: t.topic.id,
      label: t.topic.label,
      phase: t.topic.phase,
      phaseLabel: PHASE_LABELS[t.topic.phase],
      goal: t.topic.goal,
      status: t.status,
      confidence: t.confidence,
      nodeCount: t.nodeCount,
      filmCritical: t.topic.filmCritical,
      applicable: t.applicable,
    })),
    reads,
    terms: snapshot.terms,
    ambiguities: snapshot.scratch.ambiguities,
    nextTopicLabel: snapshot.scratch.nextTopicId
      ? (TOPIC_BY_ID.get(snapshot.scratch.nextTopicId)?.label ?? null)
      : null,
    overall: coverage.overall,
    filmReady: coverage.filmReady,
    missingCritical: coverage.missingCritical.map((t) => t.label),
    knowledgeCount: coverage.knowledgeCount,
  };
}

export type { InterviewTurn };
