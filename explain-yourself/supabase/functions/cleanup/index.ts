// ─────────────────────────────────────────────────────────────────────────────
// Explain Yourself — cleanup
//
// Deletes the bytes. `expire_abandoned_games()` marks rows; this actually
// removes the objects, which is the part that matters to the person whose photo
// it is. Invoke on a schedule (Dashboard → Edge Functions → Cron, or any
// external scheduler) if pg_cron is unavailable.
//
// Requires the service role, so it is deployed with --no-verify-jwt disabled:
// only a caller holding the service key or a scheduled invocation reaches it.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const key = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (key !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response("no", { status: 401 });
  }

  const { data: expired } = await admin.rpc("expire_abandoned_games");

  // Delete in batches: a room's worth of photos at a time, so one bad path does
  // not strand the rest.
  const { data: purgeable } = await admin
    .from("approved_game_assets")
    .select("id, storage_path")
    .not("purged_at", "is", null)
    .limit(500);

  let removed = 0;
  const paths = ((purgeable ?? []) as Array<{ id: string; storage_path: string }>)
    .map((row) => row.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await admin.storage.from("gameplay-photos").remove(batch);
    if (!error) removed += batch.length;
  }

  const { data: droppedRows } = await admin.rpc("drop_purged_asset_rows");
  const { data: droppedRooms } = await admin.rpc("drop_old_rooms");

  return Response.json({
    expired,
    objectsRemoved: removed,
    assetRowsDropped: droppedRows,
    roomsDropped: droppedRooms,
  });
});
