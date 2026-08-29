import { z } from "zod";
import { trainingSessionSchema, type TrainingSession } from "@/lib/reps/schema";

export const STATE_COOKIE = "nextrep.state";

/** Keeps the serialised cookie comfortably under the 4KB browser limit. */
export const MAX_STORED_SESSIONS = 4;

/**
 * Only sessions live in the cookie. Games and reps go to the content backend —
 * real uploaded film must never be stored only on the player's device.
 */
export const storeStateSchema = z.object({
  version: z.literal(1),
  sessions: z.array(trainingSessionSchema),
});

export type StoreState = z.infer<typeof storeStateSchema>;

export const EMPTY_STATE: StoreState = { version: 1, sessions: [] };

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

export function upsertSession(state: StoreState, session: TrainingSession): StoreState {
  const sessions = [session, ...state.sessions.filter((existing) => existing.id !== session.id)];
  return { ...state, sessions: sessions.slice(0, MAX_STORED_SESSIONS) };
}
