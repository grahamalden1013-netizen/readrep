"use server";

import { revalidatePath } from "next/cache";

import { runInterviewTurn } from "@/lib/ai/coach-interview";
import { API_KEY_VAR, providerMode } from "@/lib/ai/anthropic";
import { getInterviewSnapshot } from "@/lib/interview/queries";
import { fingerprintOf, type NormalizedTurn } from "@/lib/interview/normalize";
import { createClient } from "@/lib/supabase/server";
import { toInterviewView, type InterviewView } from "@/lib/interview/view";
import type { InterviewSnapshot } from "@/lib/interview/types";

export type InterviewResult =
  | { ok: true; view: InterviewView; mode: string; rejected: string[]; corrections: string[] }
  | { ok: false; kind: string; message: string };

export type SimpleResult = { ok: true } | { ok: false; message: string };

/**
 * Server-side authorization, run on every turn.
 *
 * The browser submits a team id; that is a claim, not a fact. This confirms the
 * caller is signed in, is a coach, and owns this specific team before anything
 * is read or written. RLS enforces the same rule at the database — this layer
 * exists so a failure is a clear message rather than a silent empty result.
 * Creates the playbook row on first use.
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
 * Writes a validated turn.
 *
 * Nothing here reads a field name from model output — the normalizer already
 * reduced the turn to a fixed set of typed values, and this maps them onto
 * columns explicitly.
 */
async function persistTurn(
  snapshot: InterviewSnapshot,
  playbookId: string,
  coachMessage: string | null,
  turn: NormalizedTurn,
  meta: { provider: string; model: string; promptVersion: string; latencyMs: number; inputTokens: number | null; outputTokens: number | null },
  ended: boolean,
) {
  const supabase = await createClient();

  if (coachMessage) {
    await supabase
      .from("playbook_interview_turns")
      .insert({ playbook_id: playbookId, role: "coach", content: coachMessage });
  }

  const confirmedById = new Map(
    snapshot.knowledge.filter((k) => k.provenance === "confirmed").map((k) => [k.id, k]),
  );

  // --- Revisions -----------------------------------------------------------
  for (const update of turn.updates) {
    // Never silently overwrite coaching philosophy the coach confirmed. A
    // replacement becomes a proposal they accept or decline.
    if (update.replacesConfirmedRule && confirmedById.has(update.id) && !update.retire) {
      await supabase.from("playbook_rule_changes").insert({
        playbook_id: playbookId,
        target_id: update.id,
        proposed_instruction: update.instruction ?? confirmedById.get(update.id)!.instruction,
        proposed_trigger: update.trigger,
        reason: update.reason,
      });
      continue;
    }

    if (update.retire) {
      await supabase
        .from("playbook_knowledge")
        .update({ status: "superseded" })
        .eq("id", update.id)
        .eq("playbook_id", playbookId);
      continue;
    }

    await applyKnowledgePatch(playbookId, update.id, {
      instruction: update.instruction,
      trigger: update.trigger,
      priority: update.priority,
      confidence: update.confidence,
    });
  }

  // --- Confirmed inferences: a guess the coach has now agreed with ----------
  for (const confirmation of turn.confirmations) {
    const node = snapshot.knowledge.find((k) => k.id === confirmation.id);
    if (!node || node.provenance === "confirmed") continue;

    await supabase
      .from("playbook_knowledge")
      .update({
        provenance: "confirmed",
        confirmed_at: new Date().toISOString(),
        fingerprint: fingerprintOf({ ...node, provenance: "confirmed" }),
      })
      .eq("id", confirmation.id)
      .eq("playbook_id", playbookId);
  }

  // --- New knowledge. Parents before children so parent_id can be set. -----
  const idByRef = new Map<string, string>();
  const ordered = [...turn.nodes].sort((a, b) =>
    a.parentRef && !b.parentRef ? 1 : !a.parentRef && b.parentRef ? -1 : 0,
  );

  for (const node of ordered) {
    const row = {
      playbook_id: playbookId,
      area_id: node.areaId,
      phase: node.phase,
      action: node.action,
      coverage: node.coverage,
      role: node.role,
      clock: node.clock,
      trigger: node.trigger,
      instruction: node.instruction,
      priority: node.priority,
      confidence: node.confidence,
      provenance: node.provenance,
      confirmed_at: node.provenance === "confirmed" ? new Date().toISOString() : null,
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

  // --- Terminology ---------------------------------------------------------
  if (turn.terminology.length > 0) {
    await supabase.from("playbook_terms").insert(
      turn.terminology.map((t) => ({
        playbook_id: playbookId,
        term: t.term,
        meaning: t.meaning,
        category: t.category,
        origin: "interview",
      })),
    );
  }

  // --- Unknowns: close what this answer resolved, open what it revealed ----
  if (turn.resolvedUnknowns.length > 0) {
    const resolved = new Set(turn.resolvedUnknowns.map((q) => q.toLowerCase()));
    const ids = snapshot.unknowns
      .filter((u) => resolved.has(u.question.toLowerCase()))
      .map((u) => u.id);
    if (ids.length > 0) {
      await supabase
        .from("playbook_unknowns")
        .update({ resolved_at: new Date().toISOString() })
        .in("id", ids);
    }
  }

  for (const unknown of turn.unknowns) {
    // Duplicates are prevented by a partial unique index on open questions.
    await supabase.from("playbook_unknowns").insert({
      playbook_id: playbookId,
      area_id: unknown.areaId,
      question: unknown.question,
      why_it_matters: unknown.whyItMatters,
      importance: unknown.importance,
    });
  }

  // --- Area coverage -------------------------------------------------------
  if (turn.coverageUpdates.length > 0) {
    await supabase.from("playbook_area_state").upsert(
      turn.coverageUpdates.map((c) => ({
        playbook_id: playbookId,
        area_id: c.areaId,
        status: c.status,
        confidence: c.confidence,
        note: c.note,
      })),
      { onConflict: "playbook_id,area_id" },
    );
  }

  // --- The reply, traceable to provider, model and prompt version ----------
  await supabase.from("playbook_interview_turns").insert({
    playbook_id: playbookId,
    role: "assistant",
    content: turn.assistantMessage,
    area_id: turn.nextAreaId,
    reason: turn.nextQuestionReason,
    information_value: turn.informationValue,
    provider: meta.provider,
    model: meta.model,
    prompt_version: meta.promptVersion,
    latency_ms: meta.latencyMs,
    input_tokens: meta.inputTokens,
    output_tokens: meta.outputTokens,
  });

  await supabase
    .from("team_playbooks")
    .update({
      interview_state: {
        suggestions: turn.suggestions,
        nextAreaId: turn.nextAreaId,
        endedAt: ended ? new Date().toISOString() : (snapshot.scratch.endedAt ?? null),
      },
    })
    .eq("id", playbookId);
}

async function applyKnowledgePatch(
  playbookId: string,
  nodeId: string,
  values: { instruction: string | null; trigger: string | null; priority: number | null; confidence: number | null },
) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (values.instruction !== null) patch.instruction = values.instruction;
  if (values.trigger !== null) patch.trigger = values.trigger;
  if (values.priority !== null) patch.priority = values.priority;
  if (values.confidence !== null) patch.confidence = values.confidence;
  if (Object.keys(patch).length === 0) return;

  // The fingerprint encodes trigger and priority, so changing either has to
  // recompute it or the row stops matching its own slot.
  const { data: current } = await supabase
    .from("playbook_knowledge")
    .select("area_id, phase, action, coverage, role, clock, trigger, priority, provenance")
    .eq("id", nodeId)
    .eq("playbook_id", playbookId)
    .maybeSingle();

  if (current) {
    patch.fingerprint = fingerprintOf({
      areaId: current.area_id,
      phase: current.phase,
      action: current.action,
      coverage: current.coverage,
      role: current.role,
      clock: current.clock,
      trigger: values.trigger !== null ? values.trigger : current.trigger,
      priority: values.priority !== null ? values.priority : current.priority,
      provenance: current.provenance,
    });
  }

  await supabase
    .from("playbook_knowledge")
    .update(patch)
    .eq("id", nodeId)
    .eq("playbook_id", playbookId);
}

async function loadAndRun(
  teamId: string,
  coachMessage: string | null,
  mode: "interview" | "teach",
): Promise<InterviewResult> {
  const auth = await authorize(teamId);
  if (!auth.ok) return { ok: false, kind: "forbidden", message: auth.message };

  if (providerMode() === "unconfigured") {
    return {
      ok: false,
      kind: "unconfigured",
      message: `ReadRep has no model configured. Set ${API_KEY_VAR} to run the interview.`,
    };
  }

  const snapshot = await getInterviewSnapshot(teamId);
  if (!snapshot) return { ok: false, kind: "not_found", message: "Could not load your playbook." };

  const result = await runInterviewTurn(snapshot, coachMessage, { mode });
  if (!result.ok) {
    // The coach's words are worth keeping even when the model call failed, so
    // they aren't retyped on retry.
    if (coachMessage) {
      const supabase = await createClient();
      await supabase
        .from("playbook_interview_turns")
        .insert({ playbook_id: auth.playbookId, role: "coach", content: coachMessage });
    }
    return { ok: false, kind: result.kind, message: result.message };
  }

  await persistTurn(snapshot, auth.playbookId, coachMessage, result.turn, result.meta, result.end);

  // "Film-ready" is ReadRep's judgement, computed from stored facts.
  if (result.readiness.status === "film_ready" && !snapshot.completedAt) {
    const supabase = await createClient();
    await supabase
      .from("team_playbooks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", auth.playbookId);
    revalidatePath("/coach");
  }

  const fresh = await getInterviewSnapshot(teamId);
  if (!fresh) return { ok: false, kind: "not_found", message: "Could not reload your playbook." };

  revalidatePath("/coach/playbook");

  return {
    ok: true,
    view: toInterviewView(fresh),
    mode: result.meta.provider,
    rejected: result.turn.rejected,
    corrections: result.corrections,
  };
}

/** Opens the interview with no coach message. */
export async function startInterview(teamId: string): Promise<InterviewResult> {
  return loadAndRun(teamId, null, "interview");
}

export async function sendCoachMessage(teamId: string, message: string): Promise<InterviewResult> {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: false, kind: "empty", message: "Say something first." };
  if (trimmed.length > 4000) {
    return { ok: false, kind: "too_long", message: "That's longer than ReadRep can take in one go." };
  }
  return loadAndRun(teamId, trimmed, "interview");
}

/**
 * "Teach ReadRep something" from the Playbook page. Same engine and the same
 * extraction rules, but a one-off rather than a conversation turn.
 */
export async function teachReadRep(teamId: string, message: string): Promise<InterviewResult> {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: false, kind: "empty", message: "Tell ReadRep something first." };
  if (trimmed.length > 2000) {
    return { ok: false, kind: "too_long", message: "Keep it to a couple of sentences." };
  }
  return loadAndRun(teamId, trimmed, "teach");
}

/** Accept a proposed replacement for a rule the coach previously confirmed. */
export async function resolveRuleChange(
  teamId: string,
  changeId: string,
  decision: "apply" | "decline",
): Promise<SimpleResult> {
  const auth = await authorize(teamId);
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const { data: change } = await supabase
    .from("playbook_rule_changes")
    .select("id, target_id, proposed_instruction, proposed_trigger")
    .eq("id", changeId)
    .eq("playbook_id", auth.playbookId)
    .eq("status", "pending")
    .maybeSingle();

  if (!change) return { ok: false, message: "That change is no longer pending." };

  if (decision === "apply") {
    await applyKnowledgePatch(auth.playbookId, change.target_id, {
      instruction: change.proposed_instruction,
      trigger: change.proposed_trigger,
      priority: null,
      confidence: null,
    });
  }

  await supabase
    .from("playbook_rule_changes")
    .update({
      status: decision === "apply" ? "applied" : "declined",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", changeId)
    .eq("playbook_id", auth.playbookId);

  revalidatePath("/coach/playbook");
  return { ok: true };
}

/** Strike a read from the panel without arguing with the model about it. */
export async function retireKnowledge(teamId: string, nodeId: string): Promise<SimpleResult> {
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

/** Promote an inference to confirmed, from the panel. */
export async function confirmKnowledge(teamId: string, nodeId: string): Promise<SimpleResult> {
  const auth = await authorize(teamId);
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const { data: node } = await supabase
    .from("playbook_knowledge")
    .select("area_id, phase, action, coverage, role, clock, trigger, priority")
    .eq("id", nodeId)
    .eq("playbook_id", auth.playbookId)
    .maybeSingle();

  if (!node) return { ok: false, message: "That's no longer in your playbook." };

  const { error } = await supabase
    .from("playbook_knowledge")
    .update({
      provenance: "confirmed",
      confirmed_at: new Date().toISOString(),
      fingerprint: fingerprintOf({
        areaId: node.area_id,
        phase: node.phase,
        action: node.action,
        coverage: node.coverage,
        role: node.role,
        clock: node.clock,
        trigger: node.trigger,
        priority: node.priority,
        provenance: "confirmed",
      }),
    })
    .eq("id", nodeId)
    .eq("playbook_id", auth.playbookId);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/coach/playbook");
  return { ok: true };
}
