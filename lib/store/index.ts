import "server-only";
import { cookies } from "next/headers";
import { tryGetBackend } from "@/lib/db";
import { DEMO_GAME, DEMO_REPS } from "@/lib/reps/seed";
import type { Game, Rep, TrainingSession } from "@/lib/reps/schema";
import {
  decodeState,
  encodeState,
  STATE_COOKIE,
  upsertSession,
  type StoreState,
} from "./state";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Reads combine two sources: the seeded demo, which ships as code and needs no
 * configuration, and the content backend, which holds real uploaded film.
 *
 * Sessions are separate again: they are anonymous and per-device, so they live
 * in a cookie. That is what lets the demo run without an account.
 */

export async function readState(): Promise<StoreState> {
  const cookieStore = await cookies();
  return decodeState(cookieStore.get(STATE_COOKIE)?.value);
}

/** Only callable from a Server Action or Route Handler. */
export async function writeState(state: StoreState): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, encodeState(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function listGames(): Promise<Game[]> {
  const backend = await tryGetBackend();
  const stored = backend ? await backend.listGames() : [];
  return [...stored, DEMO_GAME];
}

export async function getGame(gameId: string): Promise<Game | null> {
  if (gameId === DEMO_GAME.id) return DEMO_GAME;
  const backend = await tryGetBackend();
  return backend ? backend.getGame(gameId) : null;
}

export async function getRepsForGame(
  gameId: string,
  options?: { includeDrafts?: boolean },
): Promise<Rep[]> {
  if (gameId === DEMO_GAME.id) {
    return [...DEMO_REPS].sort((a, b) => a.order - b.order);
  }
  const backend = await tryGetBackend();
  return backend ? backend.listReps(gameId, options) : [];
}

export async function getRepsByIds(repIds: string[]): Promise<Rep[]> {
  const seeded = new Map(DEMO_REPS.map((rep) => [rep.id, rep]));
  const missing = repIds.filter((id) => !seeded.has(id));

  const fetched = new Map<string, Rep>();
  if (missing.length > 0) {
    const backend = await tryGetBackend();
    const results = backend ? await Promise.all(missing.map((id) => backend.getRep(id))) : [];
    for (const rep of results) {
      if (rep) fetched.set(rep.id, rep);
    }
  }

  return repIds.flatMap((id) => {
    const rep = seeded.get(id) ?? fetched.get(id);
    return rep ? [rep] : [];
  });
}

export async function getSession(sessionId: string): Promise<TrainingSession | null> {
  const state = await readState();
  return state.sessions.find((session) => session.id === sessionId) ?? null;
}

export async function listSessions(): Promise<TrainingSession[]> {
  const state = await readState();
  return state.sessions;
}

export async function saveSession(session: TrainingSession): Promise<void> {
  await writeState(upsertSession(await readState(), session));
}
