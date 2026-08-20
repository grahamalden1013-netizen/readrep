// ─────────────────────────────────────────────────────────────────────────────
// Explain Yourself — session
//
// The authoritative game loop. Clients never compute state and push it; they
// send an intent here and are told what happened.
//
// Division of labour, on purpose:
//   • Authorization lives in SQL. Every player-initiated action is performed by
//     calling an RPC *as the player*, so their own RLS applies. If the database
//     says no, this function never sees the action succeed.
//   • The state machine lives here, run with the service role, because writing
//     it in PL/pgSQL would make it a second, subtly different implementation of
//     rules that already exist twice (here and in Swift).
//
// The service-role key is used for exactly two things: reading the private
// state and writing the next one. It is never used to perform an action on
// behalf of a caller who was not allowed to perform it.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { PrivateState, Player, Round, Vote } from "../_shared/types.ts";
import {
  advance, beginRound, retireRound, finish, publicState,
  everyoneActed, AssetPool,
} from "../_shared/engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action =
  | { action: "start"; roomId: string }
  | { action: "advance"; roomId: string }
  | { action: "skip"; roomId: string }
  | { action: "end"; roomId: string }
  | { action: "vote"; roomId: string; roundId: string; choice: unknown }
  | { action: "answer"; roomId: string; roundId: string; body: string }
  | { action: "removePhoto"; roomId: string; roundId: string }
  | { action: "report"; roomId: string; roundId: string }
  | { action: "tick"; roomId: string }
  | { action: "sync"; roomId: string };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fail(status: number, code: string, message: string) {
  // A raw database error never reaches a screen. The app maps `code` to copy
  // it wrote itself.
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method", "POST only");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail(401, "unauthenticated", "Sign in first.");

  // Acts as the caller. Everything this client does is subject to the caller's
  // own row level security.
  const asUser: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return fail(401, "unauthenticated", "Sign in first.");

  let body: Action;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Malformed request.");
  }
  if (!body?.roomId) return fail(400, "bad_request", "Missing room.");

  // Membership is checked against the caller's own view of the world, not a
  // service-role read: if their RLS does not show them the room, they are not
  // in it.
  const { data: membership } = await asUser
    .from("game_players")
    .select("user_id, is_host, kicked")
    .eq("room_id", body.roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.kicked) return fail(403, "not_a_member", "You're not in this game.");
  const isHost = membership.is_host === true;

  const hostOnly = ["start", "advance", "skip", "end"];
  if (hostOnly.includes(body.action) && !isHost) {
    return fail(403, "host_only", "Only the host can do that.");
  }

  const [state, players, pools] = await Promise.all([
    loadState(admin, body.roomId),
    loadPlayers(admin, body.roomId),
    loadPools(admin, body.roomId),
  ]);
  if (!state) return fail(404, "no_session", "That game is gone.");

  let next: PrivateState = state;

  switch (body.action) {
    case "start": {
      if (state.phase !== "waiting" && state.phase !== "ready" && state.phase !== "preparingPhotos") {
        return fail(409, "already_started", "This game already started.");
      }
      const ready = players.filter((p) => p.status === "ready");
      if (ready.length < 3) return fail(409, "not_enough_players", "You need at least 3 players.");
      if (pools.filter((p) => p.assetIDs.length > 0).length < 2) {
        return fail(409, "not_enough_assets", "At least 2 players need approved photos.");
      }
      await admin.from("game_rooms").update({ lifecycle: "inProgress" }).eq("id", body.roomId);
      next = await beginRound({ ...state, completedRounds: [], scores: {}, roundIndex: -1 }, pools, 0);
      break;
    }

    case "advance":
      next = await advance(state, players, pools);
      break;

    case "tick": {
      // Any device may nudge an expired deadline. It is idempotent — a phase
      // whose deadline has not passed does nothing — so a room full of phones
      // all noticing at once produces one transition, not six.
      if (!state.phaseDeadline || new Date(state.phaseDeadline) > new Date()) {
        return respond(state);
      }
      next = await advance(state, players, pools);
      break;
    }

    case "skip":
      next = await retireRound(state, players, pools, "skipped");
      break;

    case "end":
      next = finish(
        state.currentRound
          ? {
              ...state,
              currentRound: null,
              completedRounds: [...state.completedRounds, { ...state.currentRound, status: "skipped" }],
            }
          : state,
        "hostEnded",
      );
      await admin.from("game_rooms").update({ lifecycle: "finished" }).eq("id", body.roomId);
      break;

    case "vote": {
      // Performed as the caller: `submit_vote` re-checks the phase, the round,
      // eligibility, and refuses a second vote via a primary key.
      const { error } = await asUser.rpc("submit_vote", {
        p_round: body.roundId,
        p_choice: body.choice,
      });
      if (error) return mapRpcError(error.message);
      next = await refreshRoundActivity(admin, state, players, pools);
      break;
    }

    case "answer": {
      const { error } = await asUser.rpc("submit_answer", {
        p_round: body.roundId,
        p_body: body.body,
      });
      if (error) return mapRpcError(error.message);
      next = await refreshRoundActivity(admin, state, players, pools);
      break;
    }

    case "removePhoto": {
      const { error } = await asUser.rpc("remove_photo", { p_round: body.roundId });
      if (error) return mapRpcError(error.message);
      await deleteAssetBytes(admin, state.currentRound);
      next = await retireRound(state, players, pools, "removedByOwner");
      break;
    }

    case "report": {
      const { error } = await asUser.rpc("report_photo", { p_round: body.roundId });
      if (error) return mapRpcError(error.message);
      await deleteAssetBytes(admin, state.currentRound);
      next = await retireRound(state, players, pools, "skipped");
      break;
    }

    case "sync":
      return respond(state);

    default:
      return fail(400, "bad_request", "Unknown action.");
  }

  await persist(admin, body.roomId, state, next);
  return respond(next);
});

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persist(
  admin: SupabaseClient,
  roomId: string,
  previous: PrivateState,
  next: PrivateState,
) {
  if (next.revision === previous.revision) return;

  await admin.from("game_session_private").upsert({
    room_id: roomId,
    private_state: next,
    updated_at: new Date().toISOString(),
  });

  // Mirror rounds into their own table. The storage read policy keys off this:
  // a photo is only fetchable once a round has actually dealt it.
  const rounds = [...next.completedRounds, ...(next.currentRound ? [next.currentRound] : [])];
  for (const round of rounds) {
    await admin.from("rounds").upsert({
      id: round.id,
      room_id: roomId,
      round_index: round.index,
      mode: round.mode,
      owner_id: round.ownerID,
      asset_id: round.assetID,
      commitment: round.commitment?.digest ?? null,
      status: round.status,
      owner_revealed: round.ownerRevealed,
      secret_delivered: round.secretDelivered,
      results_revealed: round.resultsRevealed,
      started_at: round.startedAt,
    }, { onConflict: "id" });

    if (round.secret) {
      await admin.from("round_secrets").upsert({
        round_id: round.id,
        owner_id: round.ownerID,
        instruction: round.secret.instruction,
        nonce: round.secret.nonce,
      }, { onConflict: "round_id" });
    }
  }

  // Written last, and this is the only row anyone subscribes to. Writing it
  // after the rounds means a device can never receive a state that references a
  // round the database has not got yet.
  await admin.from("game_sessions").update({
    public_state: publicState(next),
    revision: next.revision,
    phase: next.phase,
    round_index: next.roundIndex,
    updated_at: new Date().toISOString(),
  }).eq("room_id", roomId);

  if (next.phase === "gameComplete") {
    await admin.from("game_rooms").update({ lifecycle: "finished" }).eq("id", roomId);
    // The bytes go as soon as the game is over. The recap is text.
    await admin.from("approved_game_assets")
      .update({ purged_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .is("purged_at", null);
  }
}

async function loadState(admin: SupabaseClient, roomId: string): Promise<PrivateState | null> {
  const { data } = await admin
    .from("game_session_private")
    .select("private_state")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!data) return null;

  const stored = data.private_state as Partial<PrivateState>;
  const { data: room } = await admin
    .from("game_rooms").select("settings").eq("id", roomId).maybeSingle();

  return {
    roomID: roomId,
    settings: (room?.settings ?? stored.settings) as PrivateState["settings"],
    phase: stored.phase ?? "waiting",
    roundIndex: stored.roundIndex ?? -1,
    currentRound: stored.currentRound ?? null,
    completedRounds: stored.completedRounds ?? [],
    scores: stored.scores ?? {},
    revision: stored.revision ?? 0,
    phaseDeadline: stored.phaseDeadline ?? null,
    endedReason: stored.endedReason ?? null,
    // Derived once from the room id so a game is replayable from its own row.
    dealerSeed: stored.dealerSeed ?? seedFromRoom(roomId),
    dealerStep: stored.dealerStep ?? 0,
  };
}

function seedFromRoom(roomId: string): string {
  const hex = roomId.replace(/-/g, "").slice(0, 16);
  return BigInt("0x" + hex).toString();
}

async function loadPlayers(admin: SupabaseClient, roomId: string): Promise<Player[]> {
  const { data } = await admin
    .from("game_players")
    .select("user_id, nickname, is_host, status, approved_asset_count")
    .eq("room_id", roomId)
    .eq("kicked", false)
    .order("joined_at");
  const rows = (data ?? []) as Array<{
    user_id: string; nickname: string; is_host: boolean;
    status: Player["status"]; approved_asset_count: number;
  }>;
  return rows.map((row) => ({
    id: row.user_id,
    nickname: row.nickname,
    isHost: row.is_host,
    status: row.status,
    approvedAssetCount: row.approved_asset_count,
  }));
}

/** Only assets a human tapped KEEP on, that are still live. */
async function loadPools(admin: SupabaseClient, roomId: string): Promise<AssetPool[]> {
  const { data } = await admin
    .from("approved_game_assets")
    .select("id, owner_id")
    .eq("room_id", roomId)
    .is("purged_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");

  const byOwner = new Map<string, string[]>();
  for (const row of (data ?? []) as Array<{ id: string; owner_id: string }>) {
    byOwner.set(row.owner_id, [...(byOwner.get(row.owner_id) ?? []), row.id]);
  }
  return [...byOwner.entries()].map(([ownerID, assetIDs]) => ({ ownerID, assetIDs }));
}

/**
 * Pull the votes and answers the database now holds into the in-memory round,
 * then end the phase early if everybody is in. The database is the source of
 * truth for who acted, not the request that happened to arrive last.
 */
async function refreshRoundActivity(
  admin: SupabaseClient,
  state: PrivateState,
  players: Player[],
  pools: AssetPool[],
): Promise<PrivateState> {
  if (!state.currentRound) return state;

  const [{ data: votes }, { data: answers }] = await Promise.all([
    admin.from("round_votes").select("round_id, voter_id, choice, cast_at")
      .eq("round_id", state.currentRound.id),
    admin.from("player_answers").select("id, round_id, author_id, body, submitted_at")
      .eq("round_id", state.currentRound.id).order("submitted_at"),
  ]);

  const round: Round = {
    ...state.currentRound,
    votes: ((votes ?? []) as Array<{
      round_id: string; voter_id: string; choice: Vote["choice"]; cast_at: string;
    }>).map((v) => ({
      roundID: v.round_id, voterID: v.voter_id, choice: v.choice, castAt: v.cast_at,
    })),
    answers: ((answers ?? []) as Array<{
      id: string; round_id: string; author_id: string; body: string; submitted_at: string;
    }>).map((a) => ({
      id: a.id, roundID: a.round_id, authorID: a.author_id,
      text: a.body, submittedAt: a.submitted_at,
    })),
  };

  const updated: PrivateState = { ...state, currentRound: round, revision: state.revision + 1 };
  if (everyoneActed(round, players, state.phase)) {
    return advance(updated, players, pools);
  }
  return updated;
}

async function deleteAssetBytes(admin: SupabaseClient, round: Round | null) {
  if (!round) return;
  const { data } = await admin
    .from("approved_game_assets").select("storage_path").eq("id", round.assetID).maybeSingle();
  if (data?.storage_path) {
    // Best effort and idempotent. The cleanup job catches anything that fails.
    await admin.storage.from("gameplay-photos").remove([data.storage_path]);
  }
}

function respond(state: PrivateState) {
  return new Response(JSON.stringify({ state: publicState(state) }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Database error codes become copy the app already wrote. */
function mapRpcError(message: string) {
  const table: Record<string, [number, string, string]> = {
    EY401: [401, "unauthenticated", "Sign in first."],
    EY403: [403, "not_a_member", "You're not in this game."],
    EY403O: [403, "not_yours", "That isn't your photo."],
    "EY409P": [409, "wrong_phase", "That moment has passed."],
    "EY409R": [409, "wrong_round", "This round already moved on."],
    EY404: [404, "not_found", "We couldn't find that."],
    EY400: [400, "bad_request", "That didn't look right."],
  };
  for (const [code, [status, slug, copy]] of Object.entries(table)) {
    if (message.includes(code)) return fail(status, slug, copy);
  }
  return fail(500, "server", "Try that again in a second.");
}
