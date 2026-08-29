import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeState,
  encodeState,
  EMPTY_STATE,
  MAX_STORED_SESSIONS,
  upsertSession,
} from "@/lib/store/state";
import type { TrainingSession } from "@/lib/reps/schema";

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
  const state = upsertSession(EMPTY_STATE, session("s"));
  assert.deepEqual(decodeState(encodeState(state)), state);
});

test("corrupt, stale or absent cookies fall back to empty state instead of throwing", () => {
  assert.deepEqual(decodeState(undefined), EMPTY_STATE);
  assert.deepEqual(decodeState("not-base64-json"), EMPTY_STATE);
  assert.deepEqual(decodeState(Buffer.from("{}").toString("base64url")), EMPTY_STATE);
  assert.deepEqual(
    decodeState(Buffer.from(JSON.stringify({ version: 99, sessions: [] })).toString("base64url")),
    EMPTY_STATE,
  );
  // A session whose shape no longer validates takes the whole cookie with it.
  assert.deepEqual(
    decodeState(
      Buffer.from(JSON.stringify({ version: 1, sessions: [{ id: "x" }] })).toString("base64url"),
    ),
    EMPTY_STATE,
  );
});

test("the cookie never carries games — real film has to live in the backend", () => {
  const encoded = encodeState(upsertSession(EMPTY_STATE, session("s")));
  const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  assert.equal(decoded.games, undefined);
  assert.deepEqual(Object.keys(decoded).sort(), ["sessions", "version"]);
});

test("upserts replace by id and keep the newest first", () => {
  const once = upsertSession(EMPTY_STATE, session("a"));
  const twice = upsertSession(upsertSession(once, session("b")), {
    ...session("a"),
    completedAt: "2026-02-15T10:05:00.000Z",
  });
  assert.equal(twice.sessions.length, 2);
  assert.equal(twice.sessions[0].id, "a");
  assert.equal(twice.sessions[0].completedAt, "2026-02-15T10:05:00.000Z");
});

test("stored history is capped so the cookie stays under the size limit", () => {
  let state = EMPTY_STATE;
  for (let i = 0; i < MAX_STORED_SESSIONS + 3; i += 1) state = upsertSession(state, session(`s${i}`));

  assert.equal(state.sessions.length, MAX_STORED_SESSIONS);
  assert.ok(encodeState(state).length < 4096, `encoded state was ${encodeState(state).length} bytes`);
});
