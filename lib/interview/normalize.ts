import type { InterviewTurnOutput, KnowledgeUpdateOutput } from "@/lib/ai/schemas";
import { AREA_BY_ID, isKnownArea } from "@/lib/interview/areas";
import { categoriseTerm, parseConditions } from "@/lib/interview/conditions";
import {
  ACTIONS,
  CLOCKS,
  COVERAGES,
  ROLES,
  type Action,
  type Clock,
  type Coverage,
  type Phase,
  type Role,
} from "@/lib/interview/vocabulary";
import type { KnowledgeNode, Provenance } from "@/lib/interview/types";

/**
 * The gate between model output and the database.
 *
 * This carries more weight than it used to. The wire schema now states shape
 * only — no string lengths, no array caps, no basketball vocabulary — because
 * encoding those in the JSON Schema compiled to a grammar Anthropic refused.
 * So every one of those limits is enforced here instead, on output the model
 * has no way to influence: unknown areas are dropped, ids that don't belong to
 * this playbook are refused, free-text conditions are mapped onto the closed
 * vocabulary, lengths are trimmed and lists are capped.
 *
 * Nothing reaches Supabase except the typed values this file produces.
 */

// Caps that used to be `maxItems` in the grammar.
const MAX_KNOWLEDGE = 20;
const MAX_UNKNOWNS = 8;
const MAX_TERMS = 8;
const MAX_CONFLICTS = 5;
const MAX_SUGGESTIONS = 4;
const MAX_CONDITIONS = 8;
const MAX_NOT_APPLICABLE = 8;

// Lengths that used to be `maxLength` in the grammar.
const LEN_MESSAGE = 900;
const LEN_VALUE = 240;
const LEN_TRIGGER = 240;
const LEN_TERM = 60;
const LEN_QUESTION = 240;
const LEN_SUGGESTION = 60;
const LEN_ID = 64;

export type NormalizedNode = {
  ref: string;
  areaId: string;
  concept: string;
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
  op: "revise" | "retire" | "confirm";
  instruction: string | null;
  trigger: string | null;
  confidence: number | null;
  replacesConfirmedRule: boolean;
};

export type NormalizedUnknown = {
  areaId: string;
  question: string;
  importance: number;
};

export type NormalizedTurn = {
  assistantMessage: string;
  nodes: NormalizedNode[];
  updates: NormalizedUpdate[];
  terminology: { term: string; meaning: string; category: string }[];
  conflicts: { description: string; likelyException: boolean }[];
  unknowns: NormalizedUnknown[];
  resolvedUnknowns: string[];
  notApplicable: string[];
  modelReadiness: "learning" | "almost_ready" | "film_ready";
  nextAreaId: string | null;
  informationValue: "high" | "medium" | "low";
  nextQuestionReason: string | null;
  suggestions: string[];
  modelSaysEnd: boolean;
  /** Everything discarded, with a reason. Surfaced in tests and dev output. */
  rejected: string[];
};

const clean = (value: string | null | undefined, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const clamp01 = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;

/**
 * A stable identity for a read's slot in the team's system, so re-answering a
 * question updates knowledge rather than duplicating it. Provenance is part of
 * it: an inference and a confirmed rule about the same thing are different
 * rows, which is what lets a confirmation promote one without a collision.
 */
export function fingerprintOf(node: {
  areaId: string;
  concept?: string;
  instruction?: string;
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
    // Two facts in the same area often share every situation dimension:
    // "5-out" and "play fast" are both unconditional offensive identity, and
    // "Zoom" and "side ball screens" are both actions. Concept and value are
    // what keep them as separate rows rather than one overwriting the other.
    // A genuine correction comes through the `revise` op keyed by id, so
    // nothing is lost by treating differently-worded facts as different.
    (node.concept ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30),
    (node.instruction ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 80),
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

/** An area's group decides the phase a read belongs to. */
function phaseForArea(areaId: string): Phase {
  const group = AREA_BY_ID.get(areaId)?.group;
  if (group === "offense") return "offense";
  if (group === "defense") return "defense";
  return "coaching";
}

/**
 * Situation coherence. An offensive role cannot appear on a defensive read.
 * The incoherent dimension is dropped rather than the whole read — the
 * instruction is still true, just less narrowly scoped.
 */
function coerceScope(
  phase: Phase,
  scope: { action: Action | null; coverage: Coverage | null; role: Role | null; clock: Clock | null },
  rejected: string[],
) {
  let role = scope.role;

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
  if (role && phase === "coaching") role = null;

  return {
    action: (ACTIONS as readonly string[]).includes(scope.action ?? "") ? scope.action : null,
    coverage: (COVERAGES as readonly string[]).includes(scope.coverage ?? "") ? scope.coverage : null,
    role: (ROLES as readonly string[]).includes(role ?? "") ? role : null,
    clock: (CLOCKS as readonly string[]).includes(scope.clock ?? "") ? scope.clock : null,
  };
}

/**
 * Rebuilds read chains from the flat list.
 *
 * The old schema carried explicit `ref`/`parent_ref` fields; the compact one
 * doesn't, because chaining is derivable. Within one situation, the read with
 * no condition is the first look, and each conditional read branches off it:
 *
 *   side ball screen → vs drop → ball handler
 *     1. turn the corner
 *        └ if the big commits → hit the roller
 */
function linkChains(nodes: NormalizedNode[]) {
  const bySituation = new Map<string, NormalizedNode[]>();

  for (const node of nodes) {
    const key = [node.areaId, node.phase, node.action, node.coverage, node.role, node.clock].join("|");
    const list = bySituation.get(key) ?? [];
    list.push(node);
    bySituation.set(key, list);
  }

  for (const group of bySituation.values()) {
    const root = group.find((n) => n.trigger === null);
    let priority = 1;
    for (const node of group) {
      if (node.trigger === null) {
        node.priority = priority++;
      } else if (root) {
        node.parentRef = root.ref;
        node.priority = priority++;
      } else {
        node.priority = priority++;
      }
      node.fingerprint = fingerprintOf(node);
    }
  }
}

function normalizeAdd(
  raw: KnowledgeUpdateOutput,
  index: number,
  rejected: string[],
): NormalizedNode | null {
  const areaId = clean(raw.area, 80);
  if (!areaId || !isKnownArea(areaId)) {
    rejected.push(`Unknown area "${raw.area}" — knowledge discarded.`);
    return null;
  }

  const instruction = clean(raw.value, LEN_VALUE);
  if (!instruction) {
    rejected.push("Knowledge with an empty value discarded.");
    return null;
  }

  const phase = phaseForArea(areaId);
  const conditions = Array.isArray(raw.conditions)
    ? raw.conditions.slice(0, MAX_CONDITIONS).filter((c): c is string => typeof c === "string")
    : [];
  const parsed = parseConditions(conditions, phase);
  const scope = coerceScope(phase, parsed, rejected);

  const provenance: Provenance = raw.provenance === "inferred" ? "inferred" : "confirmed";

  const node: NormalizedNode = {
    ref: `n${index}`,
    areaId,
    concept: clean(raw.concept, 60) ?? "",
    phase,
    ...scope,
    trigger: clean(parsed.trigger, LEN_TRIGGER),
    instruction,
    priority: 1,
    // An inference is never allowed to look as certain as a stated fact.
    confidence: provenance === "inferred" ? Math.min(0.5, clamp01(raw.confidence)) : clamp01(raw.confidence),
    provenance,
    parentRef: null,
    fingerprint: "",
  };
  node.fingerprint = fingerprintOf(node);
  return node;
}

export function normalizeTurn(
  raw: InterviewTurnOutput,
  context: { knownNodeIds: Set<string>; existingTerms: Set<string>; openUnknowns: Set<string> },
): NormalizedTurn {
  const rejected: string[] = [];

  const nodes: NormalizedNode[] = [];
  const updates: NormalizedUpdate[] = [];
  const seen = new Set<string>();

  const knowledgeUpdates = Array.isArray(raw.knowledge_updates)
    ? raw.knowledge_updates.slice(0, MAX_KNOWLEDGE)
    : [];

  for (const [index, item] of knowledgeUpdates.entries()) {
    if (item.op === "add") {
      const node = normalizeAdd(item, index, rejected);
      if (!node) continue;
      if (seen.has(node.fingerprint)) {
        rejected.push(`Duplicate read in one turn: "${node.instruction}".`);
        continue;
      }
      seen.add(node.fingerprint);
      nodes.push(node);
      continue;
    }

    // revise / retire / confirm all need an id that belongs to this playbook.
    const id = clean(item.target_id, LEN_ID);
    if (!id || !context.knownNodeIds.has(id)) {
      rejected.push(`"${item.op}" against unknown knowledge id "${item.target_id}" discarded.`);
      continue;
    }
    if (updates.some((u) => u.id === id)) continue;

    const phase = isKnownArea(item.area) ? phaseForArea(item.area) : "coaching";
    const parsed = parseConditions(
      Array.isArray(item.conditions) ? item.conditions.slice(0, MAX_CONDITIONS) : [],
      phase,
    );

    updates.push({
      id,
      op: item.op,
      instruction: item.op === "revise" ? clean(item.value, LEN_VALUE) : null,
      trigger: item.op === "revise" ? clean(parsed.trigger, LEN_TRIGGER) : null,
      confidence: item.op === "revise" ? clamp01(item.confidence) : null,
      replacesConfirmedRule: Boolean(item.replaces_confirmed_rule),
    });
  }

  linkChains(nodes);

  // --- Unknowns ------------------------------------------------------------
  const unknowns: NormalizedUnknown[] = [];
  const resolvedUnknowns: string[] = [];

  const rawUnknowns = Array.isArray(raw.unknowns) ? raw.unknowns.slice(0, MAX_UNKNOWNS * 2) : [];
  for (const u of rawUnknowns) {
    const question = clean(u.question, LEN_QUESTION);
    if (!question) continue;

    if (u.resolved) {
      // Only a gap that is actually open can be closed.
      if (context.openUnknowns.has(question.toLowerCase())) resolvedUnknowns.push(question);
      continue;
    }

    const areaId = clean(u.area, 80);
    if (!areaId || !isKnownArea(areaId)) {
      rejected.push(`Gap recorded against a non-existent area "${u.area}".`);
      continue;
    }
    if (unknowns.some((x) => x.question.toLowerCase() === question.toLowerCase())) continue;
    if (unknowns.length >= MAX_UNKNOWNS) continue;

    unknowns.push({ areaId, question, importance: clamp01(u.importance) });
  }

  // --- Terminology ---------------------------------------------------------
  const terminology: NormalizedTurn["terminology"] = [];
  for (const t of Array.isArray(raw.terminology) ? raw.terminology.slice(0, MAX_TERMS * 2) : []) {
    const term = clean(t.term, LEN_TERM);
    const meaning = clean(t.meaning, LEN_VALUE);
    if (!term || !meaning) continue;
    if (context.existingTerms.has(term.toLowerCase())) continue;
    if (terminology.some((x) => x.term.toLowerCase() === term.toLowerCase())) continue;
    if (terminology.length >= MAX_TERMS) break;
    terminology.push({ term, meaning, category: categoriseTerm(term, meaning) });
  }

  // --- Conflicts -----------------------------------------------------------
  const conflicts = (Array.isArray(raw.conflicts) ? raw.conflicts.slice(0, MAX_CONFLICTS) : [])
    .map((c) => ({
      description: clean(c.description, LEN_QUESTION) ?? "",
      likelyException: Boolean(c.likely_exception),
    }))
    .filter((c) => c.description.length > 0);

  // --- Areas the coach ruled out -------------------------------------------
  const notApplicable = (Array.isArray(raw.areas_not_applicable) ? raw.areas_not_applicable : [])
    .map((a) => clean(a, 80))
    .filter((a): a is string => Boolean(a) && isKnownArea(a!))
    .slice(0, MAX_NOT_APPLICABLE);

  // --- Next question -------------------------------------------------------
  const nextArea = clean(raw.next_question?.area, 80);
  const nextAreaId = nextArea && isKnownArea(nextArea) ? nextArea : null;
  if (nextArea && !nextAreaId) {
    rejected.push(`Next-question area "${nextArea}" is not in ReadRep's framework.`);
  }

  const suggestions = (Array.isArray(raw.suggested_answers) ? raw.suggested_answers : [])
    .map((s) => clean(s, LEN_SUGGESTION))
    .filter((s): s is string => Boolean(s))
    .slice(0, MAX_SUGGESTIONS);

  const informationValue = (["high", "medium", "low"] as const).includes(
    raw.next_question?.information_value,
  )
    ? raw.next_question.information_value
    : "medium";

  const modelReadiness = (["learning", "almost_ready", "film_ready"] as const).includes(
    raw.film_readiness,
  )
    ? raw.film_readiness
    : "learning";

  return {
    assistantMessage: clean(raw.assistant_message, LEN_MESSAGE) ?? "",
    nodes,
    updates,
    terminology,
    conflicts,
    unknowns,
    resolvedUnknowns,
    notApplicable,
    modelReadiness,
    nextAreaId,
    informationValue,
    nextQuestionReason: clean(raw.next_question?.reason, LEN_QUESTION),
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
