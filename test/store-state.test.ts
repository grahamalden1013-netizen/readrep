import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeState,
  encodeState,
  EMPTY_STATE,
  MAX_STORED_GAMES,
  MAX_STORED_SESSIONS,
  upsertGame,
  upsertSession,
} from "@/lib/store/state";
import type { Game, TrainingSession } from "@/lib/reps/schema";

function game(id: string): Game {
  return {
    id,
    title: `Game ${id}`,
    opponent: "Dragons",
    playedOn: "2026-02-14",
    identity: { jerseyNumber: "22", teamColor: "White" },
    video: null,
    origin: "upload",
    createdAt: "2026-02-14T21:30:00.000Z",
  };
}

function session(id: string): TrainingSession {
  return {
    id,
    gameId: "demo-dragons",
    repIds: ["demo-rep-1"],
    responses: [],
    startedAt: "2026-02-15T10:00:00.000Z",
    completedAt: null,
  };
}

test("state survives a round trip", () => {
  const state = upsertSession(upsertGame(EMPTY_STATE, game("a")), session("s"));
  assert.deepEqual(decodeState(encodeState(state)), state);
});

test("corrupt, stale or absent cookies fall back to empty state instead of throwing", () => {
  assert.deepEqual(decodeState(undefined), EMPTY_STATE);
  assert.deepEqual(decodeState("not-base64-json"), EMPTY_STATE);
  assert.deepEqual(decodeState(Buffer.from("{}").toString("base64url")), EMPTY_STATE);
  assert.deepEqual(
    decodeState(Buffer.from(JSON.stringify({ version: 99, games: [] })).toString("base64url")),
    EMPTY_STATE,
  );
  // A game whose shape no longer validates takes the whole cookie with it.
  assert.deepEqual(
    decodeState(
      Buffer.from(
        JSON.stringify({ version: 1, games: [{ id: "x" }], sessions: [] }),
      ).toString("base64url"),
    ),
    EMPTY_STATE,
  );
});

test("upserts replace by id and keep the newest first", () => {
  const once = upsertGame(EMPTY_STATE, game("a"));
  const twice = upsertGame(upsertGame(once, game("b")), { ...game("a"), title: "Renamed" });
  assert.equal(twice.games.length, 2);
  assert.equal(twice.games[0].title, "Renamed");
});

test("stored history is capped so the cookie stays under the size limit", () => {
  let state = EMPTY_STATE;
  for (let i = 0; i < MAX_STORED_GAMES + 3; i += 1) state = upsertGame(state, game(`g${i}`));
  for (let i = 0; i < MAX_STORED_SESSIONS + 3; i += 1) state = upsertSession(state, session(`s${i}`));

  assert.equal(state.games.length, MAX_STORED_GAMES);
  assert.equal(state.sessions.length, MAX_STORED_SESSIONS);
  assert.ok(
    encodeState(state).length < 4096,
    `encoded state was ${encodeState(state).length} bytes`,
  );
});
