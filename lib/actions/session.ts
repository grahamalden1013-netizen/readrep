"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { trainingSessionSchema, type TrainingSession } from "@/lib/reps/schema";
import { toReveal, type RepReveal } from "@/lib/reps/public-rep";
import { getRepsByIds, getRepsForGame, getSession, saveSession } from "@/lib/store";
import type { ActionResult } from "./result";

const idSchema = z.string().min(1).max(64);

/**
 * Creates the five-rep session for a game. Called once the processing screen
 * has finished its stages, so the session id only exists if the reps do.
 */
export async function startSessionForGame(gameId: string): Promise<ActionResult<{ sessionId: string }>> {
  const parsedGameId = idSchema.safeParse(gameId);
  if (!parsedGameId.success) {
    return { ok: false, error: "That game id is not valid." };
  }

  const reps = await getRepsForGame(parsedGameId.data);
  if (reps.length === 0) {
    return { ok: false, error: "This game has no reps prepared yet." };
  }

  const session: TrainingSession = trainingSessionSchema.parse({
    id: randomUUID(),
    gameId: parsedGameId.data,
    repIds: reps.map((rep) => rep.id),
    responses: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  });

  await saveSession(session);
  return { ok: true, data: { sessionId: session.id } };
}

const answerInputSchema = z.object({
  sessionId: idSchema,
  repId: idSchema,
  choiceId: z.string().min(1).max(16),
});

export async function answerRep(input: {
  sessionId: string;
  repId: string;
  choiceId: string;
}): Promise<ActionResult<RepReveal>> {
  const parsed = answerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That answer could not be read." };
  }

  const { sessionId, repId, choiceId } = parsed.data;
  const session = await getSession(sessionId);
  if (!session) {
    return { ok: false, error: "This session has expired. Start a new one from your dashboard." };
  }
  if (!session.repIds.includes(repId)) {
    return { ok: false, error: "That rep is not part of this session." };
  }

  const [rep] = await getRepsByIds([repId]);
  if (!rep) {
    return { ok: false, error: "That rep could not be found." };
  }
  if (!rep.choices.some((choice) => choice.id === choiceId)) {
    return { ok: false, error: "That is not one of the choices." };
  }

  // First answer wins — a resubmission (double click, replayed request) returns
  // the original reveal rather than overwriting the recorded decision.
  const existing = session.responses.find((response) => response.repId === repId);
  if (existing) {
    return { ok: true, data: toReveal(rep, existing.choiceId) };
  }

  const reveal = toReveal(rep, choiceId);
  await saveSession({
    ...session,
    responses: [
      ...session.responses,
      {
        repId,
        choiceId,
        isCorrect: reveal.isCorrect,
        answeredAt: new Date().toISOString(),
      },
    ],
  });

  return { ok: true, data: reveal };
}

export async function completeSession(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = idSchema.safeParse(sessionId);
  if (!parsed.success) {
    return { ok: false, error: "That session id is not valid." };
  }

  const session = await getSession(parsed.data);
  if (!session) {
    return { ok: false, error: "This session has expired." };
  }

  if (!session.completedAt) {
    await saveSession({ ...session, completedAt: new Date().toISOString() });
  }

  return { ok: true, data: { sessionId: session.id } };
}
