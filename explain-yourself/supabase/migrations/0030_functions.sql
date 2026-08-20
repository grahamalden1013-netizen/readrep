-- ─────────────────────────────────────────────────────────────────────────────
-- Explain Yourself — authoritative server actions
--
-- Every one of these is SECURITY DEFINER with a pinned search_path, and every
-- one re-derives the caller from `auth.uid()` rather than trusting a parameter.
-- A client sends an intent; the server decides what happened.
--
-- The Swift `GameStateMachine` and these functions implement the same rules.
-- The Swift copy exists for demo mode and for tests; this copy is the one that
-- protects anything.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Room codes ──────────────────────────────────────────────────────────────
create or replace function public.generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    candidate text;
    attempts  integer := 0;
begin
    loop
        attempts := attempts + 1;
        candidate := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');

        -- Skip codes that read badly across a loud room.
        continue when candidate ~ '^(\d)\1{3}$';

        exit when not exists (
            select 1 from public.game_rooms
            where code = candidate and lifecycle in ('lobby','inProgress')
        );

        if attempts > 200 then
            raise exception 'could not allocate a room code' using errcode = 'EY001';
        end if;
    end loop;
    return candidate;
end;
$$;

-- ── Create room ─────────────────────────────────────────────────────────────
create or replace function public.create_room(p_nickname text, p_settings jsonb)
returns public.game_rooms
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_user uuid := auth.uid();
    v_room public.game_rooms;
    v_name text := btrim(p_nickname);
begin
    if v_user is null then
        raise exception 'not signed in' using errcode = 'EY401';
    end if;
    if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 12 then
        raise exception 'bad nickname' using errcode = 'EY400';
    end if;

    insert into public.profiles (id, nickname)
    values (v_user, v_name)
    on conflict (id) do update set nickname = excluded.nickname;

    insert into public.game_rooms (code, host_id, settings)
    values (public.generate_room_code(), v_user, coalesce(p_settings, '{}'::jsonb))
    returning * into v_room;

    insert into public.game_players (room_id, user_id, nickname, is_host, status)
    values (v_room.id, v_user, v_name, true, 'joined');

    insert into public.game_sessions (room_id, public_state, revision, phase, round_index)
    values (
        v_room.id,
        jsonb_build_object(
            'roomID', v_room.id, 'settings', v_room.settings, 'phase', 'waiting',
            'roundIndex', -1, 'completedRounds', '[]'::jsonb, 'scores', '{}'::jsonb,
            'revision', 0
        ),
        0, 'waiting', -1
    );

    insert into public.game_session_private (room_id, private_state)
    values (v_room.id, jsonb_build_object('rounds', '[]'::jsonb));

    return v_room;
end;
$$;

-- ── Join room ───────────────────────────────────────────────────────────────
create or replace function public.join_room(p_code text, p_nickname text)
returns public.game_rooms
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_user   uuid := auth.uid();
    v_room   public.game_rooms;
    v_name   text := btrim(p_nickname);
    v_count  integer;
begin
    if v_user is null then
        raise exception 'not signed in' using errcode = 'EY401';
    end if;

    select * into v_room
    from public.game_rooms
    where code = p_code and lifecycle in ('lobby','inProgress')
    -- Serialise concurrent joins so the capacity check below cannot be raced by
    -- an eleventh player arriving at the same instant as the tenth.
    for update;

    if v_room.id is null then
        raise exception 'room not found' using errcode = 'EY404';
    end if;
    if v_room.expires_at < now() then
        raise exception 'room expired' using errcode = 'EY410';
    end if;

    -- Rejoining is always allowed, even mid-game: that is what makes a
    -- reconnect work.
    if exists (select 1 from public.game_players
               where room_id = v_room.id and user_id = v_user and kicked = false) then
        update public.game_players
        set status = 'joined', last_seen_at = now()
        where room_id = v_room.id and user_id = v_user;
        return v_room;
    end if;

    if exists (select 1 from public.game_players
               where room_id = v_room.id and user_id = v_user and kicked = true) then
        raise exception 'removed from room' using errcode = 'EY403';
    end if;

    if v_room.lifecycle <> 'lobby' then
        raise exception 'game already started' using errcode = 'EY409';
    end if;

    select count(*) into v_count from public.game_players
    where room_id = v_room.id and kicked = false;
    if v_count >= 10 then
        raise exception 'room full' using errcode = 'EY413';
    end if;

    if exists (select 1 from public.game_players
               where room_id = v_room.id and lower(nickname) = lower(v_name) and kicked = false) then
        raise exception 'nickname taken' using errcode = 'EY409N';
    end if;

    insert into public.profiles (id, nickname)
    values (v_user, v_name)
    on conflict (id) do update set nickname = excluded.nickname;

    insert into public.game_players (room_id, user_id, nickname, status)
    values (v_room.id, v_user, v_name, 'joined');

    return v_room;
end;
$$;

-- ── Leave / kick ────────────────────────────────────────────────────────────
create or replace function public.leave_room(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
    delete from public.game_players where room_id = p_room and user_id = auth.uid();
    -- Their gameplay copies go with them, immediately.
    perform public.purge_player_assets(p_room, auth.uid());
end;
$$;

create or replace function public.kick_player(p_room uuid, p_target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_room_host(p_room) then
        raise exception 'host only' using errcode = 'EY403';
    end if;
    if p_target = auth.uid() then
        raise exception 'the host cannot kick themselves' using errcode = 'EY400';
    end if;

    update public.game_players
    set kicked = true, status = 'disconnected'
    where room_id = p_room and user_id = p_target;

    perform public.purge_player_assets(p_room, p_target);
end;
$$;

-- ── Settings ────────────────────────────────────────────────────────────────
create or replace function public.update_room_settings(p_room uuid, p_settings jsonb)
returns public.game_rooms
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_room public.game_rooms;
begin
    if not public.is_room_host(p_room) then
        raise exception 'host only' using errcode = 'EY403';
    end if;

    select * into v_room from public.game_rooms where id = p_room;
    if v_room.lifecycle <> 'lobby' then
        raise exception 'game already started' using errcode = 'EY409';
    end if;

    update public.game_rooms set settings = p_settings where id = p_room
    returning * into v_room;
    return v_room;
end;
$$;

-- ── Votes ───────────────────────────────────────────────────────────────────
create or replace function public.submit_vote(p_round uuid, p_choice jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_user  uuid := auth.uid();
    v_round public.rounds;
    v_phase text;
begin
    select * into v_round from public.rounds where id = p_round;
    if v_round.id is null then
        raise exception 'no such round' using errcode = 'EY404';
    end if;
    if not public.is_room_member(v_round.room_id) then
        raise exception 'not in this room' using errcode = 'EY403';
    end if;

    select phase into v_phase from public.game_sessions where room_id = v_round.room_id;
    if v_phase <> 'voting' then
        raise exception 'not the voting phase' using errcode = 'EY409P';
    end if;
    if v_round.status <> 'active' then
        raise exception 'round is over' using errcode = 'EY409R';
    end if;

    -- You do not get to vote on your own photo. In Who Has To Explain This that
    -- would be handing yourself the answer; in the others it is just cheating.
    if v_round.owner_id = v_user then
        raise exception 'cannot vote on your own photo' using errcode = 'EY403O';
    end if;

    -- The primary key is what actually stops a double vote, including two
    -- devices racing on a flaky network. `on conflict do nothing` makes the
    -- retry idempotent instead of an error the player would see.
    insert into public.round_votes (round_id, voter_id, choice)
    values (p_round, v_user, p_choice)
    on conflict (round_id, voter_id) do nothing;
end;
$$;

-- ── Answers ─────────────────────────────────────────────────────────────────
create or replace function public.submit_answer(p_round uuid, p_body text)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_user  uuid := auth.uid();
    v_round public.rounds;
    v_phase text;
    v_body  text := left(btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g')), 120);
begin
    if char_length(v_body) = 0 then
        raise exception 'empty answer' using errcode = 'EY400';
    end if;

    select * into v_round from public.rounds where id = p_round;
    if v_round.id is null or not public.is_room_member(v_round.room_id) then
        raise exception 'not in this room' using errcode = 'EY403';
    end if;
    if v_round.owner_id = v_user then
        raise exception 'the owner does not invent their own story' using errcode = 'EY403O';
    end if;

    select phase into v_phase from public.game_sessions where room_id = v_round.room_id;
    if v_phase <> 'answering' then
        raise exception 'not the answering phase' using errcode = 'EY409P';
    end if;

    insert into public.player_answers (round_id, author_id, body)
    values (p_round, v_user, v_body)
    on conflict (round_id, author_id) do nothing;
end;
$$;

-- ── Emergency photo removal ─────────────────────────────────────────────────
-- Mandatory, instant, unexplained. The player who taps this is never asked why,
-- never shown to anyone else as having done it, and never has it appear in a
-- statistic. The photo's bytes go immediately, not on the next cleanup pass.
create or replace function public.remove_photo(p_round uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_round public.rounds;
begin
    select * into v_round from public.rounds where id = p_round;
    if v_round.id is null then
        raise exception 'no such round' using errcode = 'EY404';
    end if;
    if v_round.owner_id <> auth.uid() then
        raise exception 'not your photo' using errcode = 'EY403O';
    end if;

    update public.rounds set status = 'removedByOwner' where id = p_round;

    -- Nothing about the round survives: not the votes cast on it, not the
    -- explanations written about it.
    delete from public.round_votes where round_id = p_round;
    delete from public.player_answers where round_id = p_round;
    delete from public.round_secrets where round_id = p_round;

    update public.approved_game_assets
    set purged_at = now()
    where id = v_round.asset_id;
end;
$$;

create or replace function public.report_photo(p_round uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_round public.rounds;
begin
    select * into v_round from public.rounds where id = p_round;
    if v_round.id is null or not public.is_room_member(v_round.room_id) then
        raise exception 'not in this room' using errcode = 'EY403';
    end if;

    insert into public.photo_reports (room_id, round_id, reporter_id)
    values (v_round.room_id, p_round, auth.uid())
    on conflict (round_id, reporter_id) do nothing;

    -- One report is enough to end the round. In a room of friends, the cost of
    -- a false positive is one skipped photo; the cost of a false negative is
    -- somebody's evening.
    update public.rounds set status = 'skipped' where id = p_round and status = 'active';
    update public.approved_game_assets set purged_at = now() where id = v_round.asset_id;
end;
$$;

-- ── Asset purging ───────────────────────────────────────────────────────────
create or replace function public.purge_player_assets(p_room uuid, p_user uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
    v_count integer;
begin
    update public.approved_game_assets
    set purged_at = now()
    where room_id = p_room and owner_id = p_user and purged_at is null;
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Nothing here is executable by `anon`. Everything requires a signed-in device,
-- even though signing in is anonymous and invisible to the player.
revoke execute on all functions in schema public from public, anon;

grant execute on function public.create_room(text, jsonb)            to authenticated;
grant execute on function public.join_room(text, text)               to authenticated;
grant execute on function public.leave_room(uuid)                    to authenticated;
grant execute on function public.kick_player(uuid, uuid)             to authenticated;
grant execute on function public.update_room_settings(uuid, jsonb)   to authenticated;
grant execute on function public.submit_vote(uuid, jsonb)            to authenticated;
grant execute on function public.submit_answer(uuid, text)           to authenticated;
grant execute on function public.remove_photo(uuid)                  to authenticated;
grant execute on function public.report_photo(uuid)                  to authenticated;

-- Deliberately NOT granted to clients: generate_room_code, purge_player_assets.
-- They are called only from other definer functions and from the cleanup job.
