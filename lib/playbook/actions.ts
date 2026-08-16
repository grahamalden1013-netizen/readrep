"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Server-side authorization: confirms the caller is the coach who owns this
 * team before any write. RLS enforces the same rule at the database, but we
 * check here too rather than relying on hidden UI or a single layer.
 * Returns the playbook id, creating the playbook row on first use.
 */
async function authorizeAndGetPlaybookId(
  teamId: string,
): Promise<{ ok: true; playbookId: string } | { ok: false; message: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You're not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "coach") {
    return { ok: false, message: "Only coaches can edit the team playbook." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!team) {
    return { ok: false, message: "You don't coach this team." };
  }

  const { data: existing } = await supabase
    .from("team_playbooks")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing) return { ok: true, playbookId: existing.id };

  const { data: created, error } = await supabase
    .from("team_playbooks")
    .insert({ team_id: teamId })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, message: error?.message ?? "Could not start your playbook." };
  }

  return { ok: true, playbookId: created.id };
}

/** Autosave a single question's answer. */
export async function saveResponse(
  teamId: string,
  questionKey: string,
  selections: string[],
  customText: string | null,
): Promise<ActionResult> {
  const auth = await authorizeAndGetPlaybookId(teamId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("playbook_responses").upsert(
    {
      playbook_id: auth.playbookId,
      question_key: questionKey,
      selections,
      custom_text: customText?.trim() ? customText.trim() : null,
    },
    { onConflict: "playbook_id,question_key" },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Records which section the coach reached, so they resume in the right place. */
export async function saveSectionProgress(
  teamId: string,
  sectionSlug: string,
): Promise<ActionResult> {
  const auth = await authorizeAndGetPlaybookId(teamId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_playbooks")
    .update({ last_section: sectionSlug })
    .eq("id", auth.playbookId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function completeOnboarding(teamId: string): Promise<ActionResult> {
  const auth = await authorizeAndGetPlaybookId(teamId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_playbooks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", auth.playbookId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/coach");
  revalidatePath("/coach/playbook");
  return { ok: true };
}

export async function addTerm(
  teamId: string,
  term: string,
  meaning: string,
  category: string,
): Promise<ActionResult> {
  const auth = await authorizeAndGetPlaybookId(teamId);
  if (!auth.ok) return auth;

  const trimmedTerm = term.trim();
  const trimmedMeaning = meaning.trim();
  if (!trimmedTerm) return { ok: false, message: "Add the term itself." };
  if (!trimmedMeaning) return { ok: false, message: "Add what the term means." };

  const allowed = [
    "offense",
    "defense",
    "transition",
    "screening",
    "spacing",
    "personnel",
    "other",
  ];
  const safeCategory = allowed.includes(category) ? category : "other";

  const supabase = await createClient();
  const { error } = await supabase.from("playbook_terms").insert({
    playbook_id: auth.playbookId,
    term: trimmedTerm,
    meaning: trimmedMeaning,
    category: safeCategory,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteTerm(teamId: string, termId: string): Promise<ActionResult> {
  const auth = await authorizeAndGetPlaybookId(teamId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbook_terms")
    .delete()
    .eq("id", termId)
    .eq("playbook_id", auth.playbookId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
