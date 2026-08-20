-- ─────────────────────────────────────────────────────────────────────────────
-- Explain Yourself — row level security
--
-- The rule this file exists to enforce, in one sentence: a device receives the
-- data it needs to render the current game state, and nothing else — not other
-- rooms, not other players' libraries, not another player's secret instruction,
-- and not the host's supposed privileges just because the host asked nicely.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles             enable row level security;
alter table public.devices              enable row level security;
alter table public.game_rooms           enable row level security;
alter table public.game_players         enable row level security;
alter table public.game_sessions        enable row level security;
alter table public.game_session_private enable row level security;
alter table public.rounds               enable row level security;
alter table public.round_secrets        enable row level security;
alter table public.round_votes          enable row level security;
alter table public.player_answers       enable row level security;
alter table public.approved_game_assets enable row level security;
alter table public.photo_exclusions     enable row level security;
alter table public.game_results         enable row level security;
alter table public.photo_reports        enable row level security;

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so the membership check itself does not recurse through the
-- policies it is used by. `search_path` is pinned: a SECURITY DEFINER function
-- with a mutable search_path is a privilege escalation waiting to happen.

create or replace function public.is_room_member(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.game_players
        where room_id = target_room
          and user_id = auth.uid()
          and kicked = false
    );
$$;

create or replace function public.is_room_host(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.game_rooms
        where id = target_room and host_id = auth.uid()
    );
$$;

create or replace function public.room_of_round(target_round uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select room_id from public.rounds where id = target_round;
$$;

revoke execute on function public.is_room_member(uuid) from public;
revoke execute on function public.is_room_host(uuid) from public;
revoke execute on function public.room_of_round(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_host(uuid) to authenticated;
grant execute on function public.room_of_round(uuid) to authenticated;

-- ── Profiles ────────────────────────────────────────────────────────────────
create policy profiles_self_select on public.profiles
    for select to authenticated using (id = auth.uid());
create policy profiles_self_upsert on public.profiles
    for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── Devices ─────────────────────────────────────────────────────────────────
create policy devices_self_all on public.devices
    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Rooms ───────────────────────────────────────────────────────────────────
-- Members can see their own room. Nobody can enumerate rooms, and nobody can
-- read a room by guessing its uuid — joining goes through `join_room(code)`,
-- which is rate limited and checks the room is joinable.
create policy game_rooms_member_select on public.game_rooms
    for select to authenticated using (public.is_room_member(id));

-- Room creation, settings changes and lifecycle transitions all happen inside
-- SECURITY DEFINER functions. There is deliberately no insert/update policy
-- here: a client cannot make itself the host of anything.

-- ── Players ─────────────────────────────────────────────────────────────────
create policy game_players_member_select on public.game_players
    for select to authenticated using (public.is_room_member(room_id));

-- A player may update their own row, and only the two columns that are theirs
-- to change. Column-level grants do the enforcing; the policy alone would let
-- somebody set `is_host`.
create policy game_players_self_update on public.game_players
    for update to authenticated
    using (user_id = auth.uid() and kicked = false)
    with check (user_id = auth.uid() and kicked = false);

revoke update on public.game_players from authenticated;
grant update (status, approved_asset_count, last_seen_at) on public.game_players to authenticated;

-- ── Session ─────────────────────────────────────────────────────────────────
create policy game_sessions_member_select on public.game_sessions
    for select to authenticated using (public.is_room_member(room_id));

revoke all on public.game_sessions from authenticated;
grant select on public.game_sessions to authenticated;

-- `game_session_private` gets no policy at all. Under RLS that is not an
-- oversight, it is the deny: with the table secured and no policy granting
-- select, `authenticated` reads zero rows. Only the service role, which bypasses
-- RLS, touches it.
revoke all on public.game_session_private from authenticated, anon;

-- ── Rounds ──────────────────────────────────────────────────────────────────
-- Members never read this table directly: `owner_id` is on it, and in No Context
-- and Who Has To Explain This that column *is* the answer. Everything a client
-- needs about a round is already in `game_sessions.public_state`.
revoke all on public.rounds from authenticated;

-- ── Round secrets ───────────────────────────────────────────────────────────
-- The single most important policy in the file.
create policy round_secrets_owner_only on public.round_secrets
    for select to authenticated
    using (
        owner_id = auth.uid()
        and exists (
            select 1 from public.rounds r
            where r.id = round_id
              and r.secret_delivered = true
        )
    );

grant select on public.round_secrets to authenticated;

comment on policy round_secrets_owner_only on public.round_secrets is
    'Owner only, and only after the card has been dealt. The host has no exception. There is no insert/update/delete policy, so a client cannot change its own instruction after seeing how the room is reacting.';

-- ── Votes ───────────────────────────────────────────────────────────────────
-- You can see that you voted. You cannot see how anyone else voted; totals
-- arrive in `public_state` once the round is decided.
create policy round_votes_self_select on public.round_votes
    for select to authenticated using (voter_id = auth.uid());

-- Votes are cast through `submit_vote()`, which checks the phase, eligibility
-- and the round. No direct insert policy: a client cannot vote in a round that
-- is not accepting votes, or vote on behalf of someone else.

-- ── Answers ─────────────────────────────────────────────────────────────────
create policy player_answers_self_select on public.player_answers
    for select to authenticated using (author_id = auth.uid());

-- ── Assets ──────────────────────────────────────────────────────────────────
-- You can see your own uploaded gameplay copies. You cannot list anyone else's,
-- in this room or any other. Reading someone else's photo during a round goes
-- through `signed_asset_url()`, which checks you are in the same room and that
-- the asset belongs to the round currently on screen.
create policy approved_assets_owner_select on public.approved_game_assets
    for select to authenticated using (owner_id = auth.uid());

create policy approved_assets_owner_insert on public.approved_game_assets
    for insert to authenticated
    with check (owner_id = auth.uid() and public.is_room_member(room_id));

create policy approved_assets_owner_delete on public.approved_game_assets
    for delete to authenticated using (owner_id = auth.uid());

-- ── Exclusions ──────────────────────────────────────────────────────────────
create policy photo_exclusions_self_all on public.photo_exclusions
    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Results ─────────────────────────────────────────────────────────────────
create policy game_results_member_select on public.game_results
    for select to authenticated using (public.is_room_member(room_id));

-- ── Reports ─────────────────────────────────────────────────────────────────
create policy photo_reports_self_insert on public.photo_reports
    for insert to authenticated
    with check (reporter_id = auth.uid() and public.is_room_member(room_id));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Only these two tables are published. `rounds`, `round_secrets` and
-- `round_votes` are NOT: a realtime subscription bypasses nothing, but it does
-- make it very easy to publish a column you meant to keep.
do $$
begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;
end
$$;

alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_players;

-- Explicitly NOT published, and worth stating so a future migration does not
-- helpfully add them: game_session_private, rounds, round_secrets, round_votes,
-- player_answers, approved_game_assets. Every one of them contains something
-- that is either somebody's answer or somebody's photo.
