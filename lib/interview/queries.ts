import { createClient } from "@/lib/supabase/server";
import { describeNode, describeScope } from "@/lib/interview/normalize";
import type {
  AreaState,
  InterviewScratch,
  InterviewSnapshot,
  InterviewTurn,
  KnowledgeNode,
  RuleChange,
  Term,
  Unknown,
} from "@/lib/interview/types";

/**
 * How much conversation the model sees. Older turns are summarized by the
 * structured knowledge itself, which is the point of extracting it.
 */
export const HISTORY_LIMIT = 24;

function parseScratch(value: unknown): InterviewScratch {
  const empty: InterviewScratch = { suggestions: [], nextAreaId: null, endedAt: null };
  if (!value || typeof value !== "object") return empty;
  const raw = value as Record<string, unknown>;
  return {
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s): s is string => typeof s === "string").slice(0, 4)
      : [],
    nextAreaId: typeof raw.nextAreaId === "string" ? raw.nextAreaId : null,
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : null,
  };
}

type KnowledgeRow = {
  id: string;
  area_id: string;
  phase: KnowledgeNode["phase"];
  action: KnowledgeNode["action"];
  coverage: KnowledgeNode["coverage"];
  role: KnowledgeNode["role"];
  clock: KnowledgeNode["clock"];
  trigger: string | null;
  instruction: string;
  priority: number;
  confidence: number;
  provenance: KnowledgeNode["provenance"];
  confirmed_at: string | null;
  parent_id: string | null;
  created_at: string;
};

const KNOWLEDGE_COLUMNS =
  "id, area_id, phase, action, coverage, role, clock, trigger, instruction, priority, confidence, provenance, confirmed_at, parent_id, created_at";

export function toNode(row: KnowledgeRow): KnowledgeNode {
  return {
    id: row.id,
    areaId: row.area_id,
    phase: row.phase,
    action: row.action,
    coverage: row.coverage,
    role: row.role,
    clock: row.clock,
    trigger: row.trigger,
    instruction: row.instruction,
    priority: row.priority,
    confidence: row.confidence,
    provenance: row.provenance,
    confirmedAt: row.confirmed_at,
    parentId: row.parent_id,
    createdAt: row.created_at,
  };
}

/**
 * Loads everything the interview needs for a team. Reads through RLS, so a
 * player — or a coach of another team — gets null rather than someone else's
 * intelligence.
 */
export async function getInterviewSnapshot(teamId: string): Promise<InterviewSnapshot | null> {
  const supabase = await createClient();

  const [{ data: playbook }, { data: team }] = await Promise.all([
    supabase
      .from("team_playbooks")
      .select("id, team_id, completed_at, interview_state")
      .eq("team_id", teamId)
      .maybeSingle(),
    supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
  ]);

  if (!playbook) return null;

  const [
    { data: knowledge },
    { data: states },
    { data: turns },
    { data: terms },
    { data: unknowns },
    { data: pendingChanges },
  ] = await Promise.all([
    supabase
      .from("playbook_knowledge")
      .select(KNOWLEDGE_COLUMNS)
      .eq("playbook_id", playbook.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .returns<KnowledgeRow[]>(),
    supabase
      .from("playbook_area_state")
      .select("area_id, status, confidence, note")
      .eq("playbook_id", playbook.id),
    supabase
      .from("playbook_interview_turns")
      .select("id, seq, role, content, area_id, reason, information_value, model, prompt_version, created_at")
      .eq("playbook_id", playbook.id)
      .order("seq", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("playbook_terms")
      .select("id, term, meaning, category, origin")
      .eq("playbook_id", playbook.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("playbook_unknowns")
      .select("id, area_id, question, why_it_matters, importance, created_at")
      .eq("playbook_id", playbook.id)
      .is("resolved_at", null)
      .order("importance", { ascending: false }),
    supabase
      .from("playbook_rule_changes")
      .select("id, target_id, proposed_instruction, proposed_trigger, reason, created_at")
      .eq("playbook_id", playbook.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const nodes = (knowledge ?? []).map(toNode);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const ruleChanges: RuleChange[] = ((pendingChanges ?? []) as {
    id: string;
    target_id: string;
    proposed_instruction: string;
    proposed_trigger: string | null;
    reason: string | null;
    created_at: string;
  }[])
    .map((c) => {
      const target = nodeById.get(c.target_id);
      if (!target) return null;
      return {
        id: c.id,
        targetId: c.target_id,
        targetInstruction: describeNode(target),
        targetScope: describeScope(target),
        proposedInstruction: c.proposed_instruction,
        proposedTrigger: c.proposed_trigger,
        reason: c.reason,
        createdAt: c.created_at,
      };
    })
    .filter((c): c is RuleChange => c !== null);

  return {
    playbookId: playbook.id,
    teamId: playbook.team_id,
    teamName: team?.name ?? "Your team",
    completedAt: playbook.completed_at,
    knowledge: nodes,
    areaStates: ((states ?? []) as { area_id: string; status: AreaState["status"]; confidence: number; note: string | null }[]).map(
      (s) => ({ areaId: s.area_id, status: s.status, confidence: s.confidence, note: s.note }),
    ),
    // Fetched newest-first for the LIMIT; the conversation reads oldest-first.
    turns: ((turns ?? []) as {
      id: string;
      seq: number;
      role: InterviewTurn["role"];
      content: string;
      area_id: string | null;
      reason: string | null;
      information_value: InterviewTurn["informationValue"];
      model: string | null;
      prompt_version: string | null;
      created_at: string;
    }[])
      .map((t) => ({
        id: t.id,
        seq: Number(t.seq),
        role: t.role,
        content: t.content,
        areaId: t.area_id,
        reason: t.reason,
        informationValue: t.information_value,
        model: t.model,
        promptVersion: t.prompt_version,
        createdAt: t.created_at,
      }))
      .reverse(),
    terms: (terms ?? []) as Term[],
    unknowns: ((unknowns ?? []) as {
      id: string;
      area_id: string;
      question: string;
      why_it_matters: string | null;
      importance: number;
      created_at: string;
    }[]).map((u) => ({
      id: u.id,
      areaId: u.area_id,
      question: u.question,
      whyItMatters: u.why_it_matters,
      importance: u.importance,
      createdAt: u.created_at,
    })),
    ruleChanges,
    scratch: parseScratch(playbook.interview_state),
  };
}

/** An empty snapshot for a team whose playbook row doesn't exist yet. */
export function emptySnapshot(teamId: string, teamName: string): InterviewSnapshot {
  return {
    playbookId: "",
    teamId,
    teamName,
    completedAt: null,
    knowledge: [],
    areaStates: [],
    turns: [],
    terms: [],
    unknowns: [],
    ruleChanges: [],
    scratch: { suggestions: [], nextAreaId: null, endedAt: null },
  };
}

export type { Unknown };
