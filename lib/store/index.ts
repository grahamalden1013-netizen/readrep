import "server-only";
import { cookies } from "next/headers";
import { DEMO_GAME, DEMO_REPS } from "@/lib/reps/seed";
import type { Game, Rep, TrainingSession } from "@/lib/reps/schema";
import {
  decodeState,
  encodeState,
  STATE_COOKIE,
  upsertGame,
  upsertSession,
  type StoreState,
} from "./state";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

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
  const state = await readState();
  return [...state.games, DEMO_GAME];
}

export async function getGame(gameId: string): Promise<Game | null> {
  if (gameId === DEMO_GAME.id) return DEMO_GAME;
  const state = await readState();
  return state.games.find((game) => game.id === gameId) ?? null;
}

/**
 * V1 has no automated moment detection, so only the seeded game has reps.
 * Uploaded games return an empty list and are surfaced as "review required".
 */
export async function getRepsForGame(gameId: string): Promise<Rep[]> {
  if (gameId === DEMO_GAME.id) {
    return [...DEMO_REPS].sort((a, b) => a.order - b.order);
  }
  return [];
}

export async function getRepsByIds(repIds: string[]): Promise<Rep[]> {
  const byId = new Map(DEMO_REPS.map((rep) => [rep.id, rep]));
  return repIds.flatMap((id) => {
    const rep = byId.get(id);
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

export async function saveGame(game: Game): Promise<void> {
  await writeState(upsertGame(await readState(), game));
}

export async function saveSession(session: TrainingSession): Promise<void> {
  await writeState(upsertSession(await readState(), session));
}
