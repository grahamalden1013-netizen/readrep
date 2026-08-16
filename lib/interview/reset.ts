"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RESET_PHRASE } from "@/lib/interview/constants";

/**
 * Start the interview over for one team.
 *
 * Deliberately narrow. This clears what the AI interview produced and nothing
 * else: the team, the coach, players, auth users, games, clips, sessions, the
 * questionnaire answers, the coverage matrix and any terminology the coach
 * typed by hand all survive. Terms are only removed when the interview created
 * them (`origin = 'interview'`).
 *
 * Requires the coach to type the phrase, because "start over" from a stray
 * click would destroy real coaching work.
 */

export type ResetResult =
  | { ok: true; cleared: Record<string, number> }
  | { ok: false; message: string };

export async function resetInterview(teamId: string, confirmation: string): Promise<ResetResult> {
  if (confirmation.trim().toLowerCase() !== RESET_PHRASE) {
    return { ok: false, message: `Type "${RESET_PHRASE}" to confirm.` };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You're not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "coach") {
    return { ok: false, message: "Only coaches can reset team intelligence." };
  }

  // Ownership, checked here and again by RLS on every delete below.
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (!team) return { ok: false, message: "You don't coach this team." };

  const { data: playbook } = await supabase
    .from("team_playbooks")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!playbook) return { ok: true, cleared: {} };

  const cleared: Record<string, number> = {};

  const wipe = async (table: string, extra?: (q: ReturnType<typeof supabase.from>) => unknown) => {
    let query = supabase.from(table).delete().eq("playbook_id", playbook.id);
    if (table === "playbook_terms") query = query.eq("origin", "interview");
    const { data, error } = await query.select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    cleared[table] = data?.length ?? 0;
    void extra;
  };

  try {
    // Rule changes and unknowns reference knowledge, so they go first.
    await wipe("playbook_rule_changes");
    await wipe("playbook_unknowns");
    await wipe("playbook_interview_turns");
    await wipe("playbook_area_state");
    await wipe("playbook_knowledge");
    await wipe("playbook_terms");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Reset failed." };
  }

  const { error } = await supabase
    .from("team_playbooks")
    .update({ completed_at: null, interview_state: {} })
    .eq("id", playbook.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/coach");
  revalidatePath("/coach/playbook");
  revalidatePath("/coach/playbook/interview");

  return { ok: true, cleared };
}
