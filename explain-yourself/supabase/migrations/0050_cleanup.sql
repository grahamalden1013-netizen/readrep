-- ─────────────────────────────────────────────────────────────────────────────
-- Explain Yourself — retention
--
-- A party game should not accumulate photographs. Everything uploaded for a
-- game is temporary by construction: rows carry an `expires_at`, and this job
-- turns expiry into actual deleted bytes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Marks expired assets so the storage sweeper can delete their objects, and
-- retires rooms that nobody came back to.
create or replace function public.expire_abandoned_games()
returns table (rooms_expired integer, assets_marked integer)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_rooms  integer;
    v_assets integer;
begin
    update public.game_rooms
    set lifecycle = 'expired'
    where lifecycle in ('lobby','inProgress')
      and expires_at < now();
    get diagnostics v_rooms = row_count;

    update public.approved_game_assets
    set purged_at = now()
    where purged_at is null
      and (
          expires_at < now()
          or room_id in (select id from public.game_rooms
                         where lifecycle in ('finished','expired'))
      );
    get diagnostics v_assets = row_count;

    return query select v_rooms, v_assets;
end;
$$;

-- Rows for assets whose bytes are gone are themselves deleted a day later, so
-- the sweeper has a window to retry a failed storage delete without losing the
-- path it needs.
create or replace function public.drop_purged_asset_rows()
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_count integer;
begin
    delete from public.approved_game_assets
    where purged_at is not null and purged_at < now() - interval '1 day';
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

-- Finished games keep their recap (awards, scores, statistics — text only, no
-- photographs) for a week so PLAY AGAIN and SHARE RESULTS still work the next
-- morning. Then the whole room goes.
create or replace function public.drop_old_rooms()
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_count integer;
begin
    delete from public.game_rooms
    where lifecycle in ('finished','expired')
      and updated_at < now() - interval '7 days';
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

revoke execute on function public.expire_abandoned_games() from public, anon, authenticated;
revoke execute on function public.drop_purged_asset_rows() from public, anon, authenticated;
revoke execute on function public.drop_old_rooms() from public, anon, authenticated;

-- ── Schedule ────────────────────────────────────────────────────────────────
-- Requires pg_cron (Dashboard -> Database -> Extensions). If it is not enabled,
-- the `cleanup` Edge Function does the same work on a scheduled invocation —
-- see supabase/functions/cleanup/index.ts.
do $$
begin
    if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
        create extension if not exists pg_cron;

        perform cron.schedule(
            'explain-yourself-expire',
            '*/15 * * * *',
            $cron$ select public.expire_abandoned_games(); $cron$
        );
        perform cron.schedule(
            'explain-yourself-drop-rows',
            '30 4 * * *',
            $cron$ select public.drop_purged_asset_rows(); select public.drop_old_rooms(); $cron$
        );
    end if;
exception when others then
    raise notice 'pg_cron not scheduled (%). Use the cleanup Edge Function instead.', sqlerrm;
end
$$;
