import {
  TOPICS,
  TOPIC_BY_ID,
  applicableTopics,
  type RelevanceSignals,
  type Topic,
} from "@/lib/interview/coverage-model";
import type { InterviewSnapshot, KnowledgeNode, TopicState } from "@/lib/interview/types";

/**
 * Coverage and film-readiness, computed from stored knowledge — never taken
 * from the model's word for it. The AI reports what it believes it learned;
 * this file decides whether that's actually enough.
 */

export type TopicCoverage = {
  topic: Topic;
  status: TopicState["status"];
  /** Blend of the model's stated confidence and how much was actually stored. */
  confidence: number;
  nodeCount: number;
  note: string | null;
  applicable: boolean;
};

export type Coverage = {
  topics: TopicCoverage[];
  /** 0-1 across applicable topics, weighted by topic importance. */
  overall: number;
  /** Film-critical topics still missing. */
  missingCritical: Topic[];
  /**
   * ReadRep can work film for this team. Requires every film-critical topic
   * to be at least partial with real stored knowledge behind it, and enough
   * overall depth that feedback won't be generic.
   */
  filmReady: boolean;
  knowledgeCount: number;
};

export function relevanceSignals(
  knowledge: KnowledgeNode[],
  topicStates: TopicState[],
): RelevanceSignals {
  const text = knowledge
    .map((k) => `${k.trigger ?? ""} ${k.instruction}`)
    .join(" ")
    .toLowerCase();

  const notApplicable = new Set(
    topicStates.filter((t) => t.status === "not_applicable").map((t) => t.topicId),
  );

  const coverages = new Set(knowledge.map((k) => k.coverage).filter(Boolean) as string[]);

  return {
    text,
    notApplicable,
    hasCoverage: (coverage) => coverages.has(coverage),
  };
}

/** A topic counts as reachable-for-dependency purposes once it's partial. */
function isAtLeastPartial(status: TopicState["status"]): boolean {
  return status === "partial" || status === "covered";
}

export function computeCoverage(snapshot: {
  knowledge: KnowledgeNode[];
  topicStates: TopicState[];
}): Coverage {
  const stateById = new Map(snapshot.topicStates.map((t) => [t.topicId, t]));
  const nodesByTopic = new Map<string, number>();
  for (const k of snapshot.knowledge) {
    nodesByTopic.set(k.topicId, (nodesByTopic.get(k.topicId) ?? 0) + 1);
  }

  const signals = relevanceSignals(snapshot.knowledge, snapshot.topicStates);
  const applicable = new Set(
    applicableTopics(signals, (id) => {
      const s = stateById.get(id);
      return s ? isAtLeastPartial(s.status) : false;
    }).map((t) => t.id),
  );

  const topics: TopicCoverage[] = TOPICS.map((topic) => {
    const state = stateById.get(topic.id);
    const nodeCount = nodesByTopic.get(topic.id) ?? 0;
    const status = state?.status ?? "unknown";

    // The model's confidence only counts as far as there is stored knowledge
    // to back it. Two recorded reads is treated as a fully evidenced topic.
    const evidence = Math.min(1, nodeCount / 2);
    const claimed = state?.confidence ?? 0;
    const confidence =
      status === "not_applicable" ? 0 : Math.min(claimed, 0.35 + 0.65 * evidence);

    return {
      topic,
      status,
      confidence: Number(confidence.toFixed(2)),
      nodeCount,
      note: state?.note ?? null,
      applicable: applicable.has(topic.id) || isAtLeastPartial(status),
    };
  });

  const scored = topics.filter((t) => t.applicable && t.status !== "not_applicable");
  const totalWeight = scored.reduce((sum, t) => sum + t.topic.weight, 0);
  const earned = scored.reduce((sum, t) => sum + t.topic.weight * t.confidence, 0);
  const overall = totalWeight === 0 ? 0 : earned / totalWeight;

  const missingCritical = topics
    .filter(
      (t) =>
        t.topic.filmCritical &&
        t.status !== "not_applicable" &&
        !(isAtLeastPartial(t.status) && t.nodeCount > 0),
    )
    .map((t) => t.topic);

  return {
    topics,
    overall: Number(overall.toFixed(2)),
    missingCritical,
    // Both gates matter: every critical topic touched, and enough total depth
    // that ReadRep isn't reasoning from a handful of one-line answers.
    filmReady: missingCritical.length === 0 && overall >= 0.6,
    knowledgeCount: snapshot.knowledge.length,
  };
}

/**
 * The topics the interview should still work through, best first.
 *
 * This is ReadRep's own ordering — the model receives it as a ranked
 * suggestion and may deviate when the conversation gives it a better reason,
 * but it can never wander outside this list.
 */
export function openTopics(snapshot: {
  knowledge: KnowledgeNode[];
  topicStates: TopicState[];
}): Topic[] {
  const coverage = computeCoverage(snapshot);
  const byId = new Map(coverage.topics.map((t) => [t.topic.id, t]));

  const stateById = new Map(snapshot.topicStates.map((t) => [t.topicId, t]));
  const signals = relevanceSignals(snapshot.knowledge, snapshot.topicStates);

  return applicableTopics(signals, (id) => {
    const s = stateById.get(id);
    return s ? isAtLeastPartial(s.status) : false;
  })
    .filter((t) => {
      const c = byId.get(t.id);
      if (!c) return true;
      if (c.status === "not_applicable") return false;
      return c.status !== "covered" || c.confidence < 0.8;
    })
    .sort((a, b) => {
      const ca = byId.get(a.id)?.confidence ?? 0;
      const cb = byId.get(b.id)?.confidence ?? 0;
      // Film-critical first, then the biggest weighted gap.
      if (a.filmCritical !== b.filmCritical) return a.filmCritical ? -1 : 1;
      return b.weight * (1 - cb) - a.weight * (1 - ca);
    });
}

export function coverageFor(snapshot: InterviewSnapshot): Coverage {
  return computeCoverage(snapshot);
}

export { TOPIC_BY_ID };
