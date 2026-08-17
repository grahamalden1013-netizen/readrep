import "server-only";

import { getProvider } from "@/lib/ai/anthropic";
import type { GenerateResult } from "@/lib/ai/provider";
import { InterviewTurnSchema, type InterviewTurnOutput } from "@/lib/ai/schemas";
import {
  OPENING_MESSAGE,
  PROMPT_VERSION,
  TEACH_PREFIX,
  buildSystemPrompt,
} from "@/lib/ai/prompts/coach-interview-v3";
import { AREA_BY_ID } from "@/lib/interview/areas";
import {
  SKIP_REDUNDANCY,
  assessAreas,
  calculateFilmReadiness,
  rankedQuestions,
  shouldEndOnboarding,
  type Readiness,
} from "@/lib/interview/gain";
import { normalizeTurn, type NormalizedTurn } from "@/lib/interview/normalize";
import type { InterviewSnapshot } from "@/lib/interview/types";

/**
 * The interview engine.
 *
 * ReadRep decides what is worth asking (`lib/interview/gain.ts`); the model
 * decides how to ask it and what a natural-language answer actually contained.
 * This file joins the two and — importantly — enforces the first half rather
 * than trusting the model to respect it. A question aimed at something the
 * coach already answered is rejected here, not merely discouraged in a prompt.
 */

export { PROMPT_VERSION };

export type TurnMeta = {
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type InterviewTurnResult =
  | {
      ok: true;
      turn: NormalizedTurn;
      meta: TurnMeta;
      /** ReadRep's own readiness call, computed from stored facts. */
      readiness: Readiness;
      /** True when ReadRep has enough — its judgement, not the model's. */
      end: boolean;
      /** Redundancy violations caught and corrected. */
      corrections: string[];
    }
  | { ok: false; kind: string; message: string; mode: string };

/**
 * The conversation as the provider sees it: the coach is `user`, ReadRep is
 * `assistant`, so the model continues its own voice rather than being handed a
 * transcript to summarize.
 */
function buildMessages(
  snapshot: InterviewSnapshot,
  coachMessage: string | null,
): { role: "user" | "assistant"; content: string }[] {
  const messages: { role: "user" | "assistant"; content: string }[] = snapshot.turns.map((turn) => ({
    role: turn.role === "coach" ? ("user" as const) : ("assistant" as const),
    content: turn.content,
  }));

  if (coachMessage) messages.push({ role: "user", content: coachMessage });

  // The API requires the conversation to start with a user turn, and an
  // opening turn has no coach message at all.
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: OPENING_MESSAGE });
  }

  // Two coach messages cannot sit back to back if a previous turn failed after
  // saving the coach's words; collapse them so the API stays happy.
  const collapsed: typeof messages = [];
  for (const m of messages) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`;
    else collapsed.push({ ...m });
  }

  return collapsed;
}

/**
 * Did the model aim its question at something already settled?
 *
 * The shortlist in the prompt already excludes redundant and irrelevant areas,
 * so this should be rare — but "should be rare" is not an enforcement
 * mechanism. Returns the reason when the question must not be asked.
 */
function redundancyViolation(
  snapshot: InterviewSnapshot,
  turn: NormalizedTurn,
): string | null {
  if (!turn.nextAreaId) return null;

  const assessment = assessAreas(snapshot).find((a) => a.area.id === turn.nextAreaId);
  if (!assessment) return null;

  if (assessment.redundancy.score >= SKIP_REDUNDANCY) {
    return `asked about ${assessment.area.label} — ${assessment.redundancy.reason}`;
  }
  if (assessment.relevance < 0.25) {
    return `asked about ${assessment.area.label}, which doesn't apply to how this team plays`;
  }
  return null;
}

async function callProvider(
  snapshot: InterviewSnapshot,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<GenerateResult<InterviewTurnOutput>> {
  return getProvider().generate({
    system: buildSystemPrompt(snapshot),
    messages,
    schema: InterviewTurnSchema,
    effort: "medium",
    maxTokens: 8000,
    mockKey: snapshot.scratch.nextAreaId ?? "start",
  });
}

/**
 * Runs one interview turn: build the prompt from current state, call the
 * provider, validate, normalize, and enforce redundancy. No database access —
 * which is what lets the whole engine be exercised against a real model
 * without writing anything.
 */
export async function runInterviewTurn(
  snapshot: InterviewSnapshot,
  coachMessage: string | null,
  options: { mode?: "interview" | "teach" } = {},
): Promise<InterviewTurnResult> {
  const message =
    options.mode === "teach" && coachMessage ? `${TEACH_PREFIX}${coachMessage}` : coachMessage;

  const messages = buildMessages(snapshot, message);
  const corrections: string[] = [];

  let result = await callProvider(snapshot, messages);
  let turn: NormalizedTurn | null = null;

  const context = {
    knownNodeIds: new Set(snapshot.knowledge.map((k) => k.id)),
    existingTerms: new Set(snapshot.terms.map((t) => t.term.toLowerCase())),
    openUnknowns: new Set(snapshot.unknowns.map((u) => u.question.toLowerCase())),
  };

  if (result.ok) {
    turn = normalizeTurn(result.data, context);

    // One corrective attempt. Teaching moments don't ask a question, so the
    // check doesn't apply to them.
    const violation = options.mode === "teach" ? null : redundancyViolation(snapshot, turn);
    if (violation) {
      corrections.push(`Rejected a redundant question: ${violation}`);
      const open = rankedQuestions(snapshot);
      const retryMessages = [
        ...messages,
        { role: "assistant" as const, content: turn.assistantMessage },
        {
          role: "user" as const,
          content:
            `You just ${violation}. I already told you that. ` +
            (open.length > 0
              ? `Ask about ${open[0].area.id} instead — ${open[0].area.needs.join("; ")}.`
              : `There is nothing left worth asking. End the interview.`),
        },
      ];

      const retry = await callProvider(snapshot, retryMessages);
      if (retry.ok) {
        const retried = normalizeTurn(retry.data, context);
        if (!redundancyViolation(snapshot, retried)) {
          result = retry;
          turn = retried;
        } else {
          // Twice is enough. Stopping beats asking a coach something they
          // already answered.
          corrections.push("Second attempt was redundant too — ending the interview instead.");
          turn = { ...retried, modelSaysEnd: true };
          result = retry;
        }
      }
    }
  }

  if (!result.ok) {
    return { ok: false, kind: result.kind, message: result.message, mode: result.mode };
  }

  if (!turn || !turn.assistantMessage) {
    return {
      ok: false,
      kind: "invalid_output",
      message: "The model returned an empty reply.",
      mode: result.mode,
    };
  }

  // Readiness is computed from what is about to be stored, so the answer this
  // turn produced counts toward it.
  const projected = projectSnapshot(snapshot, turn);
  const readiness = calculateFilmReadiness(projected);
  const ending = shouldEndOnboarding(projected);

  return {
    ok: true,
    turn,
    meta: {
      provider: result.meta.provider,
      model: result.meta.model,
      promptVersion: PROMPT_VERSION,
      latencyMs: result.meta.latencyMs,
      inputTokens: result.meta.inputTokens,
      outputTokens: result.meta.outputTokens,
    },
    readiness,
    // The model's opinion can end the interview early, but it can never keep a
    // coach in it once ReadRep has what it needs.
    end: ending.end || (turn.modelSaysEnd && readiness.status !== "learning"),
    corrections,
  };
}

/**
 * What the snapshot will look like once this turn is persisted. Used to judge
 * readiness on the same facts the coach is about to see stored.
 */
export function projectSnapshot(snapshot: InterviewSnapshot, turn: NormalizedTurn) {
  const resolved = new Set(turn.resolvedUnknowns.map((q) => q.toLowerCase()));

  return {
    knowledge: [
      ...snapshot.knowledge,
      ...turn.nodes.map((n, i) => ({
        id: `projected-${i}`,
        areaId: n.areaId,
        concept: n.concept,
        phase: n.phase,
        action: n.action,
        coverage: n.coverage,
        role: n.role,
        clock: n.clock,
        trigger: n.trigger,
        instruction: n.instruction,
        priority: n.priority,
        confidence: n.confidence,
        provenance: n.provenance,
        confirmedAt: null,
        parentId: null,
        createdAt: new Date().toISOString(),
      })),
    ],
    areaStates: mergeAreaStates(snapshot, turn),
    unknowns: [
      ...snapshot.unknowns.filter((u) => !resolved.has(u.question.toLowerCase())),
      ...turn.unknowns.map((u, i) => ({
        id: `projected-unknown-${i}`,
        areaId: u.areaId,
        question: u.question,
        whyItMatters: null,
        importance: u.importance,
        createdAt: new Date().toISOString(),
      })),
    ],
    turns: [
      ...snapshot.turns,
      { role: "assistant" as const, content: turn.assistantMessage },
    ],
  };
}

/**
 * Area state now only records what the coach ruled out. Confidence is computed
 * from stored facts in `gain.ts`, so there is nothing for the model to report.
 */
function mergeAreaStates(snapshot: InterviewSnapshot, turn: NormalizedTurn) {
  const byId = new Map(snapshot.areaStates.map((s) => [s.areaId, { ...s }]));
  for (const areaId of turn.notApplicable) {
    byId.set(areaId, { areaId, status: "not_applicable", confidence: 0, note: null });
  }
  return [...byId.values()];
}

export { AREA_BY_ID };
