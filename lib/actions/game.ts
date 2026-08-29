"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gameSchema, playerIdentitySchema, type Game } from "@/lib/reps/schema";
import { saveGame } from "@/lib/store";
import type { ActionResult } from "./result";

const createGameSchema = z.object({
  title: z.string().trim().min(1, "Give the game a title.").max(120),
  opponent: z.string().trim().min(1, "Who did you play?").max(80),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  identity: playerIdentitySchema,
  fileName: z.string().trim().max(200).optional(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

/**
 * Registers an uploaded game. V1 has no automated moment detection and no
 * configured video host, so the game lands with no video source and no reps —
 * the processing screen reports it as awaiting review rather than inventing
 * an analysis that did not happen.
 */
export async function createUploadedGame(
  input: CreateGameInput,
): Promise<ActionResult<{ gameId: string }>> {
  const parsed = createGameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const game: Game = gameSchema.parse({
    id: `game-${randomUUID()}`,
    title: parsed.data.title,
    opponent: parsed.data.opponent,
    playedOn: parsed.data.playedOn,
    identity: parsed.data.identity,
    video: null,
    origin: "upload",
    createdAt: new Date().toISOString(),
  });

  await saveGame(game);
  return { ok: true, data: { gameId: game.id } };
}
