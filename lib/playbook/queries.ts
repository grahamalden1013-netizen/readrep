import { createClient } from "@/lib/supabase/server";
import type { Answers, Coverage, CoverageRole } from "@/lib/playbook/questions";

export type PlaybookTerm = {
  id: string;
  term: string;
  meaning: string;
  category: string;
};

export type CoverageRule = {
  id: string;
  phase: "offense" | "defense";
  coverage: Coverage;
  role: CoverageRole;
  reads: string[];
  note: string | null;
};

export type Playbook = {
  id: string;
  teamId: string;
  completedAt: string | null;
  lastStep: string | null;
  updatedAt: string;
  answers: Answers;
  terms: PlaybookTerm[];
  coverageRules: CoverageRule[];
};

/**
 * Loads a team's playbook. RLS restricts this to the team's coach, so a
 * player calling it gets nothing back rather than another team's data.
 */
export async function getPlaybook(teamId: string): Promise<Playbook | null> {
  const supabase = await createClient();

  const { data: playbook } = await supabase
    .from("team_playbooks")
    .select("id, team_id, completed_at, last_section, updated_at")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!playbook) return null;

  const [{ data: responses }, { data: terms }, { data: rules }] = await Promise.all([
    supabase
      .from("playbook_responses")
      .select("question_key, selections, custom_text")
      .eq("playbook_id", playbook.id),
    supabase
      .from("playbook_terms")
      .select("id, term, meaning, category")
      .eq("playbook_id", playbook.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("playbook_coverage_rules")
      .select("id, phase, coverage, role, reads, note")
      .eq("playbook_id", playbook.id),
  ]);

  const answers: Answers = {};
  for (const r of responses ?? []) {
    answers[r.question_key] = {
      selections: r.selections ?? [],
      customText: r.custom_text,
    };
  }

  return {
    id: playbook.id,
    teamId: playbook.team_id,
    completedAt: playbook.completed_at,
    // `last_section` predates step-level resume; it now stores a step id.
    lastStep: playbook.last_section,
    updatedAt: playbook.updated_at,
    answers,
    terms: terms ?? [],
    coverageRules: (rules ?? []) as CoverageRule[],
  };
}

/** True when the team has a playbook with at least one answer recorded. */
export function hasProgress(playbook: Playbook | null): boolean {
  if (!playbook) return false;
  return (
    Object.keys(playbook.answers).length > 0 ||
    playbook.terms.length > 0 ||
    playbook.coverageRules.length > 0
  );
}
