import { createClient } from "@/lib/supabase/server";
import { AREA_BY_ID } from "@/lib/interview/areas";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type { KnowledgeNode } from "@/lib/interview/types";
import type { Action, Clock, Coverage, Phase, Role } from "@/lib/interview/vocabulary";

/**
 * Situation-scoped retrieval over the structured knowledge graph.
 *
 * This is the seam the film pipeline will call: analysis says *what happened*,
 * this says *how this coach wants it played*. Scoping is strict — a read tagged
 * `vs drop` must never surface on a possession the defense switched — and
 * ranking prefers the most specifically-scoped, highest-confidence reads so a
 * prompt gets the sharpest guidance first rather than everything the coach
 * ever said.
 */

/**
 * A basketball situation the film pipeline detected. Every field is optional:
 * the more that's known, the narrower the retrieval. `phase` is offense or
 * defense only — "team" and "coaching" knowledge describes the coach, not a
 * possession, and is always in scope.
 */
export type Situation = {
  phase?: "offense" | "defense";
  action?: Action;
  coverage?: Coverage;
  role?: Role;
  clock?: Clock;
};

export type RetrievedRead = {
  node: KnowledgeNode;
  /** Conditional reads that branch off this one, in order. */
  children: KnowledgeNode[];
  scope: string;
  specificity: number;
};

const NULL_PENALTY = 0;
const MATCH_BONUS = 2;

/**
 * A node is a candidate when every dimension it declares is either unspecified
 * in the situation or an exact match. Declaring nothing makes it universal.
 */
function matches(node: KnowledgeNode, situation: Situation): boolean {
  // Team and coaching knowledge is about the coach, not the possession, so it
  // always applies.
  if (node.phase === "team" || node.phase === "coaching") return true;

  if (situation.phase && node.phase !== situation.phase) return false;
  if (node.action && situation.action && node.action !== situation.action) return false;
  if (node.coverage && situation.coverage && node.coverage !== situation.coverage) return false;
  if (node.clock && situation.clock && node.clock !== situation.clock) return false;
  if (node.role && situation.role && node.role !== situation.role) return false;

  // A coverage-specific read is meaningless on a possession with no ball
  // screen, so drop it rather than let it bleed into unrelated feedback.
  if (node.coverage && situation.action && situation.action !== "ball_screen") return false;
  if (node.action && situation.action && node.action !== situation.action) return false;

  return true;
}

/** How narrowly this read is scoped to the situation we asked about. */
function specificityOf(node: KnowledgeNode, situation: Situation): number {
  let score = 0;
  if (node.action) score += situation.action === node.action ? MATCH_BONUS : NULL_PENALTY;
  if (node.coverage) score += situation.coverage === node.coverage ? MATCH_BONUS + 1 : NULL_PENALTY;
  if (node.role) score += situation.role === node.role ? MATCH_BONUS : NULL_PENALTY;
  if (node.clock) score += situation.clock === node.clock ? MATCH_BONUS : NULL_PENALTY;
  return score;
}

export function selectReads(
  knowledge: KnowledgeNode[],
  situation: Situation,
  limit = 24,
): RetrievedRead[] {
  const childrenOf = new Map<string, KnowledgeNode[]>();
  for (const node of knowledge) {
    if (!node.parentId) continue;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  }

  const roots = knowledge.filter((n) => !n.parentId && matches(n, situation));

  return roots
    .map((node) => ({
      node,
      children: (childrenOf.get(node.id) ?? [])
        .filter((c) => matches(c, situation))
        .sort((a, b) => a.priority - b.priority),
      scope: describeScope(node),
      specificity: specificityOf(node, situation),
    }))
    .sort((a, b) => {
      if (b.specificity !== a.specificity) return b.specificity - a.specificity;
      if (b.node.confidence !== a.node.confidence) return b.node.confidence - a.node.confidence;
      return a.node.priority - b.node.priority;
    })
    .slice(0, limit);
}

export function readsToPrompt(reads: RetrievedRead[]): string {
  if (reads.length === 0) return "";

  const byScope = new Map<string, RetrievedRead[]>();
  for (const read of reads) {
    const key = `${AREA_BY_ID.get(read.node.areaId)?.label ?? read.node.areaId} — ${read.scope}`;
    const list = byScope.get(key) ?? [];
    list.push(read);
    byScope.set(key, list);
  }

  const lines: string[] = [];
  for (const [scope, group] of byScope) {
    lines.push(`  ${scope}:`);
    for (const read of [...group].sort((a, b) => a.node.priority - b.node.priority)) {
      const flag = read.node.provenance === "inferred" ? " (inferred, unconfirmed)" : "";
      lines.push(`    ${read.node.priority}. ${describeNode(read.node)}${flag}`);
      for (const child of read.children) {
        lines.push(`       └ ${describeNode(child)}`);
      }
    }
  }
  return lines.join("\n");
}

/** Loads the active knowledge graph for a team. RLS scopes this to its coach. */
export async function getTeamKnowledge(teamId: string): Promise<KnowledgeNode[]> {
  const supabase = await createClient();

  const { data: playbook } = await supabase
    .from("team_playbooks")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!playbook) return [];

  const { data } = await supabase
    .from("playbook_knowledge")
    .select(
      "id, area_id, phase, action, coverage, role, clock, trigger, instruction, priority, confidence, provenance, confirmed_at, parent_id, created_at",
    )
    .eq("playbook_id", playbook.id)
    .eq("status", "active")
    .order("priority", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    areaId: row.area_id,
    phase: row.phase as Phase,
    action: row.action as Action | null,
    coverage: row.coverage as Coverage | null,
    role: row.role as Role | null,
    clock: row.clock as Clock | null,
    trigger: row.trigger,
    instruction: row.instruction,
    priority: row.priority,
    confidence: row.confidence,
    provenance: row.provenance as "confirmed" | "inferred",
    confirmedAt: row.confirmed_at,
    parentId: row.parent_id,
    createdAt: row.created_at,
  }));
}
