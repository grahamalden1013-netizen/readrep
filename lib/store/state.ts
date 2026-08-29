import { z } from "zod";
import { gameSchema, trainingSessionSchema, type Game, type TrainingSession } from "@/lib/reps/schema";

export const STATE_COOKIE = "nextrep.state";

/** Keeps the serialised cookie comfortably under the 4KB browser limit. */
export const MAX_STORED_SESSIONS = 4;
export const MAX_STORED_GAMES = 4;

export const storeStateSchema = z.object({
  version: z.literal(1),
  games: z.array(gameSchema),
  sessions: z.array(trainingSessionSchema),
});

export type StoreState = z.infer<typeof storeStateSchema>;

export const EMPTY_STATE: StoreState = { version: 1, games: [], sessions: [] };

export function encodeState(state: StoreState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

/**
 * Persisted state is untrusted input — a stale or hand-edited cookie must not
 * take the app down, so anything that fails validation is discarded.
 */
export function decodeState(raw: string | undefined): StoreState {
  if (!raw) return EMPTY_STATE;

  try {
    const json: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const parsed = storeStateSchema.safeParse(json);
    return parsed.success ? parsed.data : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export function upsertGame(state: StoreState, game: Game): StoreState {
  const games = [game, ...state.games.filter((existing) => existing.id !== game.id)];
  return { ...state, games: games.slice(0, MAX_STORED_GAMES) };
}

export function upsertSession(state: StoreState, session: TrainingSession): StoreState {
  const sessions = [session, ...state.sessions.filter((existing) => existing.id !== session.id)];
  return { ...state, sessions: sessions.slice(0, MAX_STORED_SESSIONS) };
}
