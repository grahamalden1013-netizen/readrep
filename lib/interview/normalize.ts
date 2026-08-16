import type { InterviewTurnOutput, KnowledgeNodeOutput } from "@/lib/ai/schemas";
import { isKnownTopic } from "@/lib/interview/coverage-model";
import {
  ACTIONS,
  CLOCKS,
  COVERAGES,
  PHASES,
  ROLES,
  TERM_CATEGORIES,
  TOPIC_STATUSES,
  type Action,
  type Clock,
  type Coverage,
  type Phase,
  type Role,
  type TermCategory,
  type TopicStatus,
} from "@/lib/interview/vocabulary";
import type { KnowledgeNode } from "@/lib/interview/types";

/**
 * The gate between model output and the database.
 *
 * Schema validation already guarantees shape. This pass enforces the things a
 * JSON schema can't: that topic ids exist in *our* coverage model, that a
 * knowledge node's situation is internally coherent, that ids the model wants
 * to update actually belong to this playbook, and that nothing arrives at the
 * database as an unbounded list. Anything that fails is dropped and reported —
 * never coerced into a guess.
 */

export type NormalizedNode = {
  ref: string;
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
  parentRef: string | null;
  fingerprint: string;
};

export type NormalizedUpdate = {
  id: string;
  instruction: string | null;
  trigger: string | null;
  priority: number | null;
  confidence: number | null;
  retire: boolean;
  reason: string | null;
};

export type NormalizedTurn = {
  assistantMessage: string;
  nodes: NormalizedNode[];
  updates: NormalizedUpdate[];
  terminology: { term: string; meaning: string; category: TermCategory }[];
  ambiguities: string[];
  corrections: string[];
  confidenceUpdates: { topicId: string; confidence: number }[];
  coverageUpdates: { topicId: string; status: TopicStatus; note: string | null }[];
  nextTopicId: string | null;
  nextQuestionReason: string | null;
  modelSaysReady: boolean;
  /** Everything discarded, with a reason. Surfaced in logs and dev UI. */
  rejected: string[];
};

const MAX_NODES = 12;
const MAX_UPDATES = 12;
const MAX_TERMS = 8;

const clean = (value: string | null | undefined, max: number): string | null => {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

const inList = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;

/**
 * A stable identity for a read's slot in the team's system. Two answers that
 * describe the same situation, condition, and read order land on the same row,
 * so re-answering a question updates knowledge instead of duplicating it.
 */
export function fingerprintOf(node: {
  topicId: string;
  phase: string;
  action: string | null;
  coverage: string | null;
  role: string | null;
  clock: string | null;
  trigger: string | null;
  priority: number;
}): string {
  return [
    node.topicId,
    node.phase,
    node.action ?? "-",
    node.coverage ?? "-",
    node.role ?? "-",
    node.clock ?? "-",
    (node.trigger ?? "-").toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60),
    node.priority,
  ].join("|");
}

/**
 * Situation coherence. A coverage only means something on a ball screen; an
 * offensive role can't appear on a defensive read. Rather than reject the whole
 * node, the incoherent dimension is dropped — the instruction is still true,
 * just less narrowly scoped.
 */
function coerceScope(node: KnowledgeNodeOutput, rejected: string[]) {
  const phase = inList(PHASES, node.phase) ?? "team";
  let action = inList(ACTIONS, node.action);
  const coverage = inList(COVERAGES, node.coverage);
  let role = inList(ROLES, node.role);
  const clock = inList(CLOCKS, node.clock);

  if (coverage && action !== "ball_screen") {
    // A coverage without a ball screen is meaningless; assume the screen.
    action = "ball_screen";
  }

  const offenseRoles: Role[] = ["ball_handler", "screener", "off_ball"];
  const defenseRoles: Role[] = ["on_ball", "screener_def", "low_man", "weak_side"];
  if (role && phase === "offense" && !offenseRoles.includes(role)) {
    rejected.push(`Dropped defensive role "${role}" from an offensive read.`);
    role = null;
  }
  if (role && phase === "defense" && !defenseRoles.includes(role)) {
    rejected.push(`Dropped offensive role "${role}" from a defensive read.`);
    role = null;
  }
  if (role && (phase === "team" || phase === "coaching")) {
    role = null;
  }

  return { phase, action, coverage, role, clock };
}

export function normalizeTurn(
  raw: InterviewTurnOutput,
  context: { knownNodeIds: Set<string>; existingTerms: Set<string> },
): NormalizedTurn {
  const rejected: string[] = [];

  const nodes: NormalizedNode[] = [];
  const seenFingerprints = new Set<string>();

  for (const candidate of raw.extracted_knowledge.slice(0, MAX_NODES)) {
    if (!isKnownTopic(candidate.topic_id)) {
      rejected.push(`Unknown topic "${candidate.topic_id}" — knowledge discarded.`);
      continue;
    }
    const instruction = clean(candidate.instruction, 240);
    if (!instruction) {
      rejected.push("Knowledge with an empty instruction discarded.");
      continue;
    }

    const scope = coerceScope(candidate, rejected);
    const priority = Math.min(20, Math.max(1, Math.round(candidate.priority)));
    const trigger = clean(candidate.trigger, 240);

    const node: NormalizedNode = {
      ref: candidate.ref.slice(0, 60),
      topicId: candidate.topic_id,
      ...scope,
      trigger,
      instruction,
      priority,
      confidence: clamp01(candidate.confidence),
      source: candidate.source === "inferred" ? "inferred" : "coach",
      parentRef: clean(candidate.parent_ref, 60),
      fingerprint: "",
    };
    node.fingerprint = fingerprintOf(node);

    if (seenFingerprints.has(node.fingerprint)) {
      rejected.push(`Duplicate read in one turn: "${instruction}".`);
      continue;
    }
    seenFingerprints.add(node.fingerprint);
    nodes.push(node);
  }

  // A parent_ref pointing at nothing would orphan the chain — flatten it.
  const refs = new Set(nodes.map((n) => n.ref));
  for (const node of nodes) {
    if (node.parentRef && !refs.has(node.parentRef)) {
      rejected.push(`Read "${node.instruction}" referenced a missing parent — stored unlinked.`);
      node.parentRef = null;
    }
    if (node.parentRef === node.ref) node.parentRef = null;
  }

  const updates: NormalizedUpdate[] = [];
  for (const u of raw.updated_knowledge.slice(0, MAX_UPDATES)) {
    if (!context.knownNodeIds.has(u.id)) {
      // The model does not get to name arbitrary rows.
      rejected.push(`Update to unknown knowledge id "${u.id}" discarded.`);
      continue;
    }
    updates.push({
      id: u.id,
      instruction: clean(u.instruction, 240),
      trigger: clean(u.trigger, 240),
      priority: u.priority == null ? null : Math.min(20, Math.max(1, Math.round(u.priority))),
      confidence: u.confidence == null ? null : clamp01(u.confidence),
      retire: Boolean(u.retire),
      reason: clean(u.reason, 240),
    });
  }

  const terminology: NormalizedTurn["terminology"] = [];
  for (const t of raw.terminology_detected.slice(0, MAX_TERMS)) {
    const term = clean(t.term, 60);
    const meaning = clean(t.meaning, 240);
    if (!term || !meaning) continue;
    if (context.existingTerms.has(term.toLowerCase())) continue;
    if (terminology.some((x) => x.term.toLowerCase() === term.toLowerCase())) continue;
    terminology.push({
      term,
      meaning,
      category: inList(TERM_CATEGORIES, t.category) ?? "other",
    });
  }

  const confidenceUpdates: NormalizedTurn["confidenceUpdates"] = [];
  for (const c of raw.confidence_updates.slice(0, MAX_UPDATES)) {
    if (!isKnownTopic(c.topic_id)) {
      rejected.push(`Confidence for unknown topic "${c.topic_id}" discarded.`);
      continue;
    }
    confidenceUpdates.push({ topicId: c.topic_id, confidence: clamp01(c.confidence) });
  }

  const coverageUpdates: NormalizedTurn["coverageUpdates"] = [];
  for (const c of raw.coverage_updates.slice(0, MAX_UPDATES)) {
    if (!isKnownTopic(c.topic_id)) {
      rejected.push(`Coverage for unknown topic "${c.topic_id}" discarded.`);
      continue;
    }
    coverageUpdates.push({
      topicId: c.topic_id,
      status: inList(TOPIC_STATUSES, c.status) ?? "partial",
      note: clean(c.note, 240),
    });
  }

  const nextTopicId =
    raw.recommended_next_topic && isKnownTopic(raw.recommended_next_topic)
      ? raw.recommended_next_topic
      : null;
  if (raw.recommended_next_topic && !nextTopicId) {
    rejected.push(`Recommended topic "${raw.recommended_next_topic}" is not in the coverage model.`);
  }

  return {
    assistantMessage: clean(raw.assistant_message, 900) ?? "",
    nodes,
    updates,
    terminology,
    ambiguities: raw.ambiguities.map((a) => clean(a, 240)).filter((a): a is string => Boolean(a)).slice(0, 6),
    corrections: raw.corrections.map((c) => clean(c, 240)).filter((c): c is string => Boolean(c)).slice(0, 6),
    confidenceUpdates,
    coverageUpdates,
    nextTopicId,
    nextQuestionReason: clean(raw.next_question_reason, 240),
    modelSaysReady: Boolean(raw.ready_for_film),
    rejected,
  };
}

/** Human-readable rendering of a stored read, used in prompts and the UI. */
export function describeNode(node: Pick<KnowledgeNode, "trigger" | "instruction">): string {
  return node.trigger ? `If ${node.trigger} → ${node.instruction}` : node.instruction;
}

/** The situation a read belongs to, as a short label. */
export function describeScope(node: {
  phase: string;
  action: string | null;
  coverage: string | null;
  role: string | null;
  clock: string | null;
}): string {
  const bits = [
    node.action ? node.action.replace(/_/g, " ") : null,
    node.coverage ? `vs ${node.coverage}` : null,
    node.role ? node.role.replace(/_/g, " ") : null,
    node.clock ? `${node.clock} clock` : null,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : node.phase;
}
