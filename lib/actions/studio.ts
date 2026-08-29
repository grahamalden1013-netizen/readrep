"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getBackend } from "@/lib/db";
import { validateRepDraft } from "@/lib/reps/draft";
import { difficultySchema, skillCategorySchema, type Rep } from "@/lib/reps/schema";
import { getVideoDurationMs } from "@/lib/video/playback";
import type { ActionResult } from "./result";

const choiceSchema = z.object({
  id: z.string().min(1).max(16),
  label: z.string().trim().min(1, "Every answer choice needs a label.").max(120),
});

const draftSchema = z.object({
  id: z.string().min(1).max(64).nullable(),
  gameId: z.string().min(1).max(64),
  title: z.string().trim().min(1, "Give the rep a title.").max(80),
  category: skillCategorySchema,
  difficulty: difficultySchema,
  clipStartMs: z.number().int().min(0),
  decisionPauseMs: z.number().int().min(0),
  clipEndMs: z.number().int().min(0),
  situation: z.string().trim().min(1, "Describe the situation.").max(240),
  prompt: z.string().trim().min(1, "The rep needs a prompt.").max(240),
  choices: z.array(choiceSchema).min(2, "A rep needs at least two choices.").max(4),
  correctChoiceId: z.string().min(1, "Mark the best read."),
  actualChoiceId: z.string().min(1, "Mark what the player actually did."),
  actualOutcome: z.string().trim().min(1, "What happened on the play?").max(160),
  explanation: z.string().trim().min(1, "Explain the read.").max(600),
  coachingCue: z.string().trim().min(1, "Give one cue to remember.").max(120),
  publish: z.boolean(),
});

export type RepDraftInput = z.input<typeof draftSchema>;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the rep and try again.";
}

/**
 * Saves a rep draft, optionally publishing it.
 *
 * Publishing is the gate: an invalid rep can be saved as a draft and come back
 * to, but it can never reach a player. Timing is checked against the real video
 * duration here, which the schema alone cannot know.
 */
export async function saveRepDraft(input: RepDraftInput): Promise<ActionResult<{ repId: string }>> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }
  const draft = parsed.data;

  const backend = await getBackend();
  const game = await backend.getGame(draft.gameId);
  if (!game) return { ok: false, error: "That game no longer exists." };

  const siblingsForOrder = await backend.listReps(draft.gameId, { includeDrafts: true });
  const durationMs = getVideoDurationMs(game);

  const existing = draft.id ? await backend.getRep(draft.id) : null;
  if (draft.id && !existing) {
    return { ok: false, error: "That rep no longer exists." };
  }
  if (existing && existing.gameId !== draft.gameId) {
    return { ok: false, error: "That rep belongs to a different game." };
  }

  const order =
    existing?.order ??
    (siblingsForOrder.length === 0
      ? 1
      : Math.max(...siblingsForOrder.map((rep) => rep.order)) + 1);

  const candidate: Rep = {
    id: existing?.id ?? `rep_${randomUUID()}`,
    gameId: draft.gameId,
    order,
    status: draft.publish ? "published" : "draft",
    publishedAt: draft.publish ? (existing?.publishedAt ?? new Date().toISOString()) : null,
    title: draft.title,
    category: draft.category,
    difficulty: draft.difficulty,
    clipStartMs: draft.clipStartMs,
    decisionPauseMs: draft.decisionPauseMs,
    clipEndMs: draft.clipEndMs,
    situation: draft.situation,
    prompt: draft.prompt,
    choices: draft.choices,
    correctChoiceId: draft.correctChoiceId,
    actualChoiceId: draft.actualChoiceId,
    actualOutcome: draft.actualOutcome,
    explanation: draft.explanation,
    coachingCue: draft.coachingCue,
  };

  // The same gate for drafts and publishes: a rep that cannot be played is not
  // worth storing in either state.
  const issues = validateRepDraft(candidate, durationMs);
  if (issues.length > 0) {
    return { ok: false, error: issues[0].message };
  }

  await backend.saveRep(candidate);
  return { ok: true, data: { repId: candidate.id } };
}

export async function unpublishRep(repId: string): Promise<ActionResult<null>> {
  const backend = await getBackend();
  const rep = await backend.getRep(repId);
  if (!rep) return { ok: false, error: "That rep no longer exists." };

  await backend.saveRep({ ...rep, status: "draft", publishedAt: null });
  return { ok: true, data: null };
}

export async function deleteRep(repId: string): Promise<ActionResult<null>> {
  const backend = await getBackend();
  await backend.deleteRep(repId);
  return { ok: true, data: null };
}
