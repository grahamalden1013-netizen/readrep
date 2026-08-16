import type { InterviewTurnOutput, KnowledgeNodeOutput } from "@/lib/ai/schemas";
import { isKnownArea } from "@/lib/interview/areas";
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
import type { KnowledgeNode, Provenance } from "@/lib/interview/types";

/**
 * The gate between model output and the database.
 *
 * Schema validation already guarantees shape. This pass enforces what a JSON
 * schema cannot: that area ids exist in ReadRep's own framework, that ids the
 * model wants to change belong to this playbook, that a read's situation is
 * internally coherent, and that nothing arrives unbounded. Anything that fails
 * is dropped and reported — never coerced into a guess.
 */

export type NormalizedNode = {
  ref: string;
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
  replacesConfirmedRule: boolean;
  reason: string | null;
};

export type NormalizedUnknown = {
  areaId: string;
  question: string;
  whyItMatters: string | null;
  importance: number;
};

export type NormalizedTurn = {
  assistantMessage: string;
  nodes: NormalizedNode[];
  updates: NormalizedUpdate[];
  confirmations: { id: string; reason: string | null }[];
  terminology: { term: string; meaning: string; category: TermCategory }[];
  conflicts: { id: string | null; description: string; likelyException: boolean }[];
  unknowns: NormalizedUnknown[];
  resolvedUnknowns: string[];
  coverageUpdates: { areaId: string; status: TopicStatus; confidence: number; note: string | null }[];
  modelReadiness: { status: "learning" | "almost_ready" | "film_ready"; reason: string };
  nextAreaId: string | null;
  informationValue: "high" | "medium" | "low";
  nextQuestionReason: string | null;
  suggestions: string[];
  modelSaysEnd: boolean;
  /** Everything discarded, with a reason. Surfaced in tests and dev output. */
  rejected: string[];
};

const MAX_CONFIRMED = 16;
const MAX_INFERRED = 10;
const MAX_UPDATES = 10;

const clean = (value: string | null | undefined, max: number): string | null => {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

const inList = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;

/**
 * A stable identity for a read's slot in the team's system, so re-answering a
 * question updates knowledge rather than duplicating it. Provenance is part of
 * it: an inference and a confirmed rule about the same thing are different
 * rows, which is what lets a confirmation promote one without losing the other.
 */
export function fingerprintOf(node: {
  areaId: string;
  phase: string;
  action: string | null;
  coverage: string | null;
  role: string | null;
  clock: string | null;
  trigger: string | null;
  priority: number;
  provenance?: string;
}): string {
  return [
    node.areaId,
    node.phase,
    node.action ?? "-",
    node.coverage ?? "-",
    node.role ?? "-",
    node.clock ?? "-",
    (node.trigger ?? "-").toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60),
    node.priority,
    node.provenance ?? "confirmed",
  ].join("|");
}

/**
 * Situation coherence. A coverage only means something on a ball screen; an
 * offensive role cannot appear on a defensive read. The incoherent dimension is
 * dropped rather than the whole read — the instruction is still true, just less
 * narrowly scoped.
 */
function coerceScope(node: KnowledgeNodeOutput, rejected: string[]) {
  const phase = inList(PHASES, node.phase) ?? "team";
  let action = inList(ACTIONS, node.action);
  const coverage = inList(COVERAGES, node.coverage);
  let role = inList(ROLES, node.role);
  const clock = inList(CLOCKS, node.clock);

  if (coverage && action !== "ball_screen") action = "ball_screen";

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
  if (role && (phase === "team" || phase === "coaching")) role = null;

  return { phase, action, coverage, role, clock };
}

function normalizeNodes(
  candidates: KnowledgeNodeOutput[],
  provenance: Provenance,
  limit: number,
  seen: Set<string>,
  rejected: string[],
): NormalizedNode[] {
  const nodes: NormalizedNode[] = [];

  for (const candidate of candidates.slice(0, limit)) {
    if (!isKnownArea(candidate.area_id)) {
      rejected.push(`Unknown area "${candidate.area_id}" — knowledge discarded.`);
      continue;
    }
    const instruction = clean(candidate.instruction, 240);
    if (!instruction) {
      rejected.push("Knowledge with an empty instruction discarded.");
      continue;
    }

    const scope = coerceScope(candidate, rejected);
    const node: NormalizedNode = {
      ref: candidate.ref.slice(0, 60),
      areaId: candidate.area_id,
      ...scope,
      trigger: clean(candidate.trigger, 240),
      instruction,
      priority: Math.min(20, Math.max(1, Math.round(candidate.priority))),
      // An inference is never allowed to look as certain as a stated fact.
      confidence: provenance === "inferred" ? Math.min(0.5, clamp01(candidate.confidence)) : clamp01(candidate.confidence),
      provenance,
      parentRef: clean(candidate.parent_ref, 60),
      fingerprint: "",
    };
    node.fingerprint = fingerprintOf(node);

    if (seen.has(node.fingerprint)) {
      rejected.push(`Duplicate read in one turn: "${instruction}".`);
      continue;
    }
    seen.add(node.fingerprint);
    nodes.push(node);
  }

  return nodes;
}

export function normalizeTurn(
  raw: InterviewTurnOutput,
  context: { knownNodeIds: Set<string>; existingTerms: Set<string>; openUnknowns: Set<string> },
): NormalizedTurn {
  const rejected: string[] = [];
  const seen = new Set<string>();

  const confirmed = normalizeNodes(
    raw.confirmed_knowledge_updates,
    "confirmed",
    MAX_CONFIRMED,
    seen,
    rejected,
  );
  const inferred = normalizeNodes(
    raw.inferred_knowledge_updates,
    "inferred",
    MAX_INFERRED,
    seen,
    rejected,
  );
  const nodes = [...confirmed, ...inferred];

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
      replacesConfirmedRule: Boolean(u.replaces_confirmed_rule),
      reason: clean(u.reason, 240),
    });
  }

  const confirmations: NormalizedTurn["confirmations"] = [];
  for (const c of raw.confirmed_inferences.slice(0, MAX_UPDATES)) {
    if (!context.knownNodeIds.has(c.id)) {
      rejected.push(`Confirmation of unknown knowledge id "${c.id}" discarded.`);
      continue;
    }
    confirmations.push({ id: c.id, reason: clean(c.reason, 240) });
  }

  const terminology: NormalizedTurn["terminology"] = [];
  for (const t of raw.terminology_detected) {
    const term = clean(t.term, 60);
    const meaning = clean(t.meaning, 240);
    if (!term || !meaning) continue;
    if (context.existingTerms.has(term.toLowerCase())) continue;
    if (terminology.some((x) => x.term.toLowerCase() === term.toLowerCase())) continue;
    terminology.push({ term, meaning, category: inList(TERM_CATEGORIES, t.category) ?? "other" });
  }

  const unknowns: NormalizedUnknown[] = [];
  for (const u of raw.important_unknowns) {
    if (!isKnownArea(u.area_id)) {
      rejected.push(`Unknown recorded against a non-existent area "${u.area_id}".`);
      continue;
    }
    const question = clean(u.question, 240);
    if (!question) continue;
    if (unknowns.some((x) => x.question.toLowerCase() === question.toLowerCase())) continue;
    unknowns.push({
      areaId: u.area_id,
      question,
      whyItMatters: clean(u.why_it_matters, 240),
      importance: clamp01(u.importance),
    });
  }

  const resolvedUnknowns = raw.resolved_unknowns
    .map((q) => clean(q, 240))
    .filter((q): q is string => Boolean(q) && context.openUnknowns.has(q!.toLowerCase()));

  const coverageUpdates: NormalizedTurn["coverageUpdates"] = [];
  for (const c of raw.coverage_updates) {
    if (!isKnownArea(c.area_id)) {
      rejected.push(`Coverage for unknown area "${c.area_id}" discarded.`);
      continue;
    }
    coverageUpdates.push({
      areaId: c.area_id,
      status: inList(TOPIC_STATUSES, c.status) ?? "partial",
      confidence: clamp01(c.confidence),
      note: clean(c.note, 240),
    });
  }

  const conflicts = raw.knowledge_conflicts
    .map((c) => ({
      id: c.id && context.knownNodeIds.has(c.id) ? c.id : null,
      description: clean(c.description, 240) ?? "",
      likelyException: Boolean(c.likely_exception),
    }))
    .filter((c) => c.description.length > 0);

  const nextAreaId =
    raw.next_question_area && isKnownArea(raw.next_question_area) ? raw.next_question_area : null;
  if (raw.next_question_area && !nextAreaId) {
    rejected.push(`Next-question area "${raw.next_question_area}" is not in ReadRep's framework.`);
  }

  const suggestions = raw.suggested_answers
    .map((s) => clean(s, 60))
    .filter((s): s is string => Boolean(s))
    .slice(0, 4);

  return {
    assistantMessage: clean(raw.assistant_message, 900) ?? "",
    nodes,
    updates,
    confirmations,
    terminology,
    conflicts,
    unknowns,
    resolvedUnknowns,
    coverageUpdates,
    modelReadiness: {
      status: raw.film_readiness.status,
      reason: clean(raw.film_readiness.reason, 240) ?? "",
    },
    nextAreaId,
    informationValue: raw.next_question_information_value,
    nextQuestionReason: clean(raw.reason_question_is_needed, 240),
    suggestions,
    modelSaysEnd: Boolean(raw.should_end_onboarding),
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
