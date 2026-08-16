import { createClient } from "@/lib/supabase/server";
import type {
  InterviewScratch,
  InterviewSnapshot,
  InterviewTurn,
  KnowledgeNode,
  Term,
  TopicState,
} from "@/lib/interview/types";

/** How much conversation the model sees. Older turns are summarized by the
 * structured knowledge itself, which is the point of extracting it. */
export const HISTORY_LIMIT = 24;

function parseScratch(value: unknown): InterviewScratch {
  const empty: InterviewScratch = { ambiguities: [], nextTopicId: null };
  if (!value || typeof value !== "object") return empty;
  const raw = value as Record<string, unknown>;
  return {
    ambiguities: Array.isArray(raw.ambiguities)
      ? raw.ambiguities.filter((a): a is string => typeof a === "string").slice(0, 6)
      : [],
    nextTopicId: typeof raw.nextTopicId === "string" ? raw.nextTopicId : null,
  };
}

type KnowledgeRow = {
  id: string;
  topic_id: string;
  phase: KnowledgeNode["phase"];
  action: KnowledgeNode["action"];
  coverage: KnowledgeNode["coverage"];
  role: KnowledgeNode["role"];
  clock: KnowledgeNode["clock"];
  trigger: string | null;
  instruction: string;
  priority: number;
  confidence: number;
  source: KnowledgeNode["source"];
  parent_id: string | null;
  created_at: string;
};

function toNode(row: KnowledgeRow): KnowledgeNode {
  return {
    id: row.id,
    topicId: row.topic_id,
    phase: row.phase,
    action: row.action,
    coverage: row.coverage,
    role: row.role,
    clock: row.clock,
    trigger: row.trigger,
    instruction: row.instruction,
    priority: row.priority,
    confidence: row.confidence,
    source: row.source,
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

  const [{ data: knowledge }, { data: states }, { data: turns }, { data: terms }] =
    await Promise.all([
      supabase
        .from("playbook_knowledge")
        .select(
          "id, topic_id, phase, action, coverage, role, clock, trigger, instruction, priority, confidence, source, parent_id, created_at",
        )
        .eq("playbook_id", playbook.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .returns<KnowledgeRow[]>(),
      supabase
        .from("playbook_topic_state")
        .select("topic_id, status, confidence, note")
        .eq("playbook_id", playbook.id),
      supabase
        .from("playbook_interview_turns")
        .select("id, seq, role, content, topic_id, reason, created_at")
        .eq("playbook_id", playbook.id)
        .order("seq", { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase
        .from("playbook_terms")
        .select("id, term, meaning, category")
        .eq("playbook_id", playbook.id)
        .order("created_at", { ascending: true }),
    ]);

  return {
    playbookId: playbook.id,
    teamId: playbook.team_id,
    teamName: team?.name ?? "Your team",
    completedAt: playbook.completed_at,
    knowledge: (knowledge ?? []).map(toNode),
    topicStates: ((states ?? []) as TopicState[] | { topic_id: string }[]).map((s) => {
      const row = s as { topic_id: string; status: TopicState["status"]; confidence: number; note: string | null };
      return {
        topicId: row.topic_id,
        status: row.status,
        confidence: row.confidence,
        note: row.note,
      };
    }),
    // Fetched newest-first for the LIMIT; the conversation reads oldest-first.
    turns: ((turns ?? []) as { id: string; seq: number; role: InterviewTurn["role"]; content: string; topic_id: string | null; reason: string | null; created_at: string }[])
      .map((t) => ({
        id: t.id,
        seq: Number(t.seq),
        role: t.role,
        content: t.content,
        topicId: t.topic_id,
        reason: t.reason,
        createdAt: t.created_at,
      }))
      .reverse(),
    terms: (terms ?? []) as Term[],
    scratch: parseScratch(playbook.interview_state),
  };
}
