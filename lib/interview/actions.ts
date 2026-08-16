"use server";

import { revalidatePath } from "next/cache";

import { runInterviewTurn } from "@/lib/ai/coach-interview";
import { providerMode, REQUIRED_ENV_VAR } from "@/lib/ai/provider";
import { computeCoverage } from "@/lib/interview/coverage";
import { getInterviewSnapshot } from "@/lib/interview/queries";
import { fingerprintOf, type NormalizedTurn } from "@/lib/interview/normalize";
import { createClient } from "@/lib/supabase/server";
import { toInterviewView, type InterviewView } from "@/lib/interview/view";

export type InterviewResult =
  | { ok: true; view: InterviewView; mode: "live" | "mock"; rejected: string[] }
  | { ok: false; kind: string; message: string };

/**
 * Server-side authorization. Identical rule to the rest of the playbook: only
 * the coach who owns the team may teach ReadRep. RLS enforces this again at
 * the database — this check exists so a failure is a clear message rather than
 * a silent empty result. Creates the playbook row on first use.
 */
async function authorize(
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
    return { ok: false, message: "Only coaches can teach ReadRep about the team." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!team) return { ok: false, message: "You don't coach this team." };

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

/**
 * Writes a validated turn to the database.
 *
 * Nothing here reads a field name from model output — the normalizer already
 * reduced the turn to a fixed set of typed values, and this function maps them
 * onto columns explicitly.
 */
async function persistTurn(
  playbookId: string,
  coachMessage: string | null,
  turn: NormalizedTurn,
) {
  const supabase = await createClient();

  if (coachMessage) {
    await supabase.from("playbook_interview_turns").insert({
      playbook_id: playbookId,
      role: "coach",
      content: coachMessage,
    });
  }

  // --- Corrections first, so a superseded read can't be re-matched below ---
  for (const update of turn.updates) {
    if (update.retire) {
      await supabase
        .from("playbook_knowledge")
        .update({ status: "superseded" })
        .eq("id", update.id)
        .eq("playbook_id", playbookId);
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (update.instruction !== null) patch.instruction = update.instruction;
    if (update.trigger !== null) patch.trigger = update.trigger;
    if (update.priority !== null) patch.priority = update.priority;
    if (update.confidence !== null) patch.confidence = update.confidence;
    if (Object.keys(patch).length === 0) continue;

    // The fingerprint encodes trigger and priority, so a change to either has
    // to be recomputed or the row stops matching its own slot.
    const { data: current } = await supabase
      .from("playbook_knowledge")
      .select("topic_id, phase, action, coverage, role, clock, trigger, priority")
      .eq("id", update.id)
      .eq("playbook_id", playbookId)
      .maybeSingle();

    if (current) {
      patch.fingerprint = fingerprintOf({
        topicId: current.topic_id,
        phase: current.phase,
        action: current.action,
        coverage: current.coverage,
        role: current.role,
        clock: current.clock,
        trigger: update.trigger !== null ? update.trigger : current.trigger,
        priority: update.priority !== null ? update.priority : current.priority,
      });
    }

    await supabase
      .from("playbook_knowledge")
      .update(patch)
      .eq("id", update.id)
      .eq("playbook_id", playbookId);
  }

  // --- New knowledge. Parents before children so parent_id can be set. ---
  const idByRef = new Map<string, string>();
  const ordered = [...turn.nodes].sort((a, b) => {
    if (a.parentRef && !b.parentRef) return 1;
    if (!a.parentRef && b.parentRef) return -1;
    return 0;
  });

  for (const node of ordered) {
    const row = {
      playbook_id: playbookId,
      topic_id: node.topicId,
      phase: node.phase,
      action: node.action,
      coverage: node.coverage,
      role: node.role,
      clock: node.clock,
      trigger: node.trigger,
      instruction: node.instruction,
      priority: node.priority,
      confidence: node.confidence,
      source: node.source,
      parent_id: node.parentRef ? (idByRef.get(node.parentRef) ?? null) : null,
      fingerprint: node.fingerprint,
    };

    // The unique index is partial (active rows only), which ON CONFLICT can't
    // infer through PostgREST — so match explicitly, then update or insert.
    const { data: existing } = await supabase
      .from("playbook_knowledge")
      .select("id")
      .eq("playbook_id", playbookId)
      .eq("fingerprint", node.fingerprint)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("playbook_knowledge")
        .update({
          instruction: row.instruction,
          confidence: row.confidence,
          source: row.source,
          parent_id: row.parent_id,
        })
        .eq("id", existing.id);
      idByRef.set(node.ref, existing.id);
      continue;
    }

    const { data: inserted } = await supabase
      .from("playbook_knowledge")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (inserted) idByRef.set(node.ref, inserted.id);
  }

  // --- Terminology ---
  if (turn.terminology.length > 0) {
    await supabase.from("playbook_terms").insert(
      turn.terminology.map((t) => ({
        playbook_id: playbookId,
        term: t.term,
        meaning: t.meaning,
        category: t.category,
      })),
    );
  }

  // --- Topic coverage & confidence ---
  const topicPatch = new Map<string, { status?: string; confidence?: number; note?: string | null }>();
  for (const c of turn.coverageUpdates) {
    topicPatch.set(c.topicId, { ...topicPatch.get(c.topicId), status: c.status, note: c.note });
  }
  for (const c of turn.confidenceUpdates) {
    topicPatch.set(c.topicId, { ...topicPatch.get(c.topicId), confidence: c.confidence });
  }

  if (topicPatch.size > 0) {
    const { data: existingStates } = await supabase
      .from("playbook_topic_state")
      .select("topic_id, status, confidence, note")
      .eq("playbook_id", playbookId)
      .in("topic_id", [...topicPatch.keys()]);

    const before = new Map((existingStates ?? []).map((s) => [s.topic_id, s]));

    await supabase.from("playbook_topic_state").upsert(
      [...topicPatch.entries()].map(([topicId, patch]) => {
        const prior = before.get(topicId);
        return {
          playbook_id: playbookId,
          topic_id: topicId,
          status: patch.status ?? prior?.status ?? "partial",
          confidence: patch.confidence ?? prior?.confidence ?? 0.5,
          note: patch.note ?? prior?.note ?? null,
        };
      }),
      { onConflict: "playbook_id,topic_id" },
    );
  }

  // --- Assistant reply + scratch state ---
  await supabase.from("playbook_interview_turns").insert({
    playbook_id: playbookId,
    role: "assistant",
    content: turn.assistantMessage,
    topic_id: turn.nextTopicId,
    reason: turn.nextQuestionReason,
  });

  await supabase
    .from("team_playbooks")
    .update({
      interview_state: {
        ambiguities: turn.ambiguities,
        nextTopicId: turn.nextTopicId,
      },
    })
    .eq("id", playbookId);
}

async function loadAndRun(
  teamId: string,
  coachMessage: string | null,
): Promise<InterviewResult> {
  const auth = await authorize(teamId);
  if (!auth.ok) return { ok: false, kind: "forbidden", message: auth.message };

  if (providerMode() === "unconfigured") {
    return {
      ok: false,
      kind: "unconfigured",
      message: `ReadRep has no model configured. Set ${REQUIRED_ENV_VAR} to run the interview.`,
    };
  }

  const snapshot = await getInterviewSnapshot(teamId);
  if (!snapshot) {
    return { ok: false, kind: "not_found", message: "Could not load your playbook." };
  }

  const result = await runInterviewTurn(snapshot, coachMessage);
  if (!result.ok) {
    // The coach's words are worth keeping even when the model call failed, so
    // they aren't retyped on retry.
    if (coachMessage) {
      const supabase = await createClient();
      await supabase.from("playbook_interview_turns").insert({
        playbook_id: auth.playbookId,
        role: "coach",
        content: coachMessage,
      });
    }
    return { ok: false, kind: result.kind, message: result.message };
  }

  await persistTurn(auth.playbookId, coachMessage, result.turn);

  const fresh = await getInterviewSnapshot(teamId);
  if (!fresh) return { ok: false, kind: "not_found", message: "Could not reload your playbook." };

  // "Film-ready" is ReadRep's judgement, computed from stored knowledge — not
  // the model's self-report.
  const coverage = computeCoverage(fresh);
  if (coverage.filmReady && !fresh.completedAt) {
    const supabase = await createClient();
    await supabase
      .from("team_playbooks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", auth.playbookId);
    fresh.completedAt = new Date().toISOString();
    revalidatePath("/coach");
  }

  revalidatePath("/coach/playbook");

  return {
    ok: true,
    view: toInterviewView(fresh),
    mode: result.mode,
    rejected: result.turn.rejected,
  };
}

/** Opens the interview (or re-asks) with no coach message. */
export async function startInterview(teamId: string): Promise<InterviewResult> {
  return loadAndRun(teamId, null);
}

export async function sendCoachMessage(
  teamId: string,
  message: string,
): Promise<InterviewResult> {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: false, kind: "empty", message: "Say something first." };
  if (trimmed.length > 4000) {
    return { ok: false, kind: "too_long", message: "That's longer than ReadRep can take in one go." };
  }
  return loadAndRun(teamId, trimmed);
}

/**
 * Direct correction from the learning panel. The coach can strike a read
 * without arguing with the model about it.
 */
export async function retireKnowledge(
  teamId: string,
  nodeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await authorize(teamId);
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("playbook_knowledge")
    .update({ status: "superseded" })
    .eq("id", nodeId)
    .eq("playbook_id", auth.playbookId);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/coach/playbook");
  return { ok: true };
}
