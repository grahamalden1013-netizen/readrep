-- ─────────────────────────────────────────────────────────────────────────────
-- Explain Yourself — core schema
--
-- Design notes that matter more than the DDL:
--
-- 1. Identity is Supabase anonymous auth. `auth.uid()` is the player. Nobody
--    registers an email to play a party game in someone's living room; Sign in
--    with Apple later *links* to the same uid rather than replacing it.
--
-- 2. There is no table here that can hold a camera roll. `approved_game_assets`
--    holds only rows a human explicitly approved, and its rows expire.
--
-- 3. `game_sessions.public_state` is the ONLY thing broadcast over Realtime, and
--    it is written pre-redacted. Secrets live in `round_secrets`, which no
--    client can read except its owner. This is deliberate: filtering on the way
--    out of the database is a control, filtering on the way into a view is a
--    hope.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    nickname    text not null check (char_length(nickname) between 1 and 12),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.profiles is
    'Nickname only. No email, no phone, no avatar, nothing that identifies a person outside the room they are sitting in.';

-- ── Devices (for push + reconnection bookkeeping; optional) ─────────────────
create table if not exists public.devices (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id) on delete cascade,
    platform      text not null default 'ios' check (platform in ('ios')),
    app_version   text,
    last_seen_at  timestamptz not null default now(),
    created_at    timestamptz not null default now()
);
create index if not exists devices_user_idx on public.devices(user_id);

-- ── Rooms ───────────────────────────────────────────────────────────────────
create table if not exists public.game_rooms (
    id          uuid primary key default gen_random_uuid(),
    code        text not null check (code ~ '^[0-9]{4}$'),
    host_id     uuid not null references auth.users(id) on delete cascade,
    settings    jsonb not null default '{"mode":"explainYourself","roundCount":10,"intensity":"dangerous","soundEnabled":true}'::jsonb,
    lifecycle   text not null default 'lobby'
                check (lifecycle in ('lobby','inProgress','finished','expired')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    expires_at  timestamptz not null default now() + interval '6 hours'
);

-- A four digit code only has to be unique among rooms you could actually join.
-- Recycling finished codes is what keeps them four digits long.
create unique index if not exists game_rooms_active_code_idx
    on public.game_rooms(code)
    where lifecycle in ('lobby','inProgress');

create index if not exists game_rooms_expiry_idx on public.game_rooms(expires_at)
    where lifecycle in ('lobby','inProgress');

-- ── Players ─────────────────────────────────────────────────────────────────
create table if not exists public.game_players (
    room_id              uuid not null references public.game_rooms(id) on delete cascade,
    user_id              uuid not null references auth.users(id) on delete cascade,
    nickname             text not null check (char_length(nickname) between 1 and 12),
    is_host              boolean not null default false,
    status               text not null default 'joined'
                         check (status in ('joined','selectingPhotos','ready','disconnected')),
    -- A count, never a description. The library itself never leaves the device.
    approved_asset_count integer not null default 0 check (approved_asset_count >= 0),
    joined_at            timestamptz not null default now(),
    last_seen_at         timestamptz not null default now(),
    kicked               boolean not null default false,
    primary key (room_id, user_id)
);

create unique index if not exists game_players_unique_nickname_idx
    on public.game_players(room_id, lower(nickname))
    where kicked = false;

create index if not exists game_players_user_idx on public.game_players(user_id);

-- ── Session ─────────────────────────────────────────────────────────────────
create table if not exists public.game_sessions (
    room_id       uuid primary key references public.game_rooms(id) on delete cascade,
    -- Pre-redacted. Safe for the least privileged reader in the room, because
    -- this row is broadcast verbatim over Realtime to every member.
    public_state  jsonb not null,
    revision      integer not null default 0,
    phase         text not null default 'waiting',
    round_index   integer not null default -1,
    updated_at    timestamptz not null default now()
);

-- The authoritative state, including owner ids for concealed rounds.
--
-- This is a separate table rather than a column on `game_sessions` for one
-- specific reason: Realtime publishes whole rows. Keeping the secret half in a
-- table that is not in the publication means the answer cannot be broadcast by
-- accident, whereas a revoked column relies on Realtime honouring column-level
-- grants — which is not a guarantee worth betting a game mechanic on.
create table if not exists public.game_session_private (
    room_id       uuid primary key references public.game_rooms(id) on delete cascade,
    private_state jsonb not null,
    updated_at    timestamptz not null default now()
);

comment on table public.game_session_private is
    'Service role only. No RLS policies exist for it, which under an enabled RLS means authenticated clients can read exactly nothing.';

-- ── Rounds ──────────────────────────────────────────────────────────────────
create table if not exists public.rounds (
    id                uuid primary key default gen_random_uuid(),
    room_id           uuid not null references public.game_rooms(id) on delete cascade,
    round_index       integer not null,
    mode              text not null,
    owner_id          uuid not null references auth.users(id) on delete cascade,
    asset_id          uuid not null,
    -- SHA-256 over `nonce|instruction`, published at round start so the answer
    -- cannot be chosen after the votes are in.
    commitment        text,
    status            text not null default 'active'
                      check (status in ('active','removedByOwner','skipped','complete')),
    owner_revealed    boolean not null default false,
    secret_delivered  boolean not null default false,
    results_revealed  boolean not null default false,
    started_at        timestamptz not null default now(),
    unique (room_id, round_index)
);

create index if not exists rounds_room_idx on public.rounds(room_id);

-- ── Round secrets ───────────────────────────────────────────────────────────
-- The whole point of the game mode lives in this table's RLS policy.
create table if not exists public.round_secrets (
    round_id    uuid primary key references public.rounds(id) on delete cascade,
    owner_id    uuid not null references auth.users(id) on delete cascade,
    instruction text not null check (instruction in ('tellTheTruth','lie')),
    nonce       text not null,
    created_at  timestamptz not null default now()
);

comment on table public.round_secrets is
    'Readable by exactly one person: the photo owner, and only once the round has delivered their card. Not readable by the host.';

-- ── Votes ───────────────────────────────────────────────────────────────────
create table if not exists public.round_votes (
    round_id  uuid not null references public.rounds(id) on delete cascade,
    voter_id  uuid not null references auth.users(id) on delete cascade,
    choice    jsonb not null,
    cast_at   timestamptz not null default now(),
    -- One vote each, enforced by the database. The UI hiding the buttons after
    -- you tap is a nicety; this is the control.
    primary key (round_id, voter_id)
);

-- ── Answers ─────────────────────────────────────────────────────────────────
create table if not exists public.player_answers (
    id           uuid primary key default gen_random_uuid(),
    round_id     uuid not null references public.rounds(id) on delete cascade,
    author_id    uuid not null references auth.users(id) on delete cascade,
    body         text not null check (char_length(body) between 1 and 120),
    submitted_at timestamptz not null default now(),
    unique (round_id, author_id)
);

-- ── Approved assets ─────────────────────────────────────────────────────────
create table if not exists public.approved_game_assets (
    id           uuid primary key default gen_random_uuid(),
    room_id      uuid not null references public.game_rooms(id) on delete cascade,
    owner_id     uuid not null references auth.users(id) on delete cascade,
    storage_path text not null unique,
    width        integer not null,
    height       integer not null,
    byte_size    integer not null,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz not null default now() + interval '6 hours',
    purged_at    timestamptz
);

comment on table public.approved_game_assets is
    'One row per photo a human explicitly tapped KEEP on, for one specific game. Rejected and NEVER USE photos have no row here and no bytes in storage — they are never uploaded at all.';

create index if not exists approved_assets_room_idx on public.approved_game_assets(room_id);
create index if not exists approved_assets_expiry_idx on public.approved_game_assets(expires_at)
    where purged_at is null;

-- ── Exclusions ──────────────────────────────────────────────────────────────
-- NEVER USE, persisted across reinstalls once a player signs in with Apple.
-- The stored value is a salted hash of the PhotoKit local identifier: enough to
-- recognise the same photo on the same account, useless to anyone else.
create table if not exists public.photo_exclusions (
    user_id      uuid not null references auth.users(id) on delete cascade,
    asset_digest text not null check (char_length(asset_digest) = 64),
    created_at   timestamptz not null default now(),
    primary key (user_id, asset_digest)
);

-- ── Results ─────────────────────────────────────────────────────────────────
create table if not exists public.game_results (
    room_id    uuid primary key references public.game_rooms(id) on delete cascade,
    results    jsonb not null,
    created_at timestamptz not null default now()
);

-- ── Moderation ──────────────────────────────────────────────────────────────
create table if not exists public.photo_reports (
    id          uuid primary key default gen_random_uuid(),
    room_id     uuid not null references public.game_rooms(id) on delete cascade,
    round_id    uuid not null references public.rounds(id) on delete cascade,
    reporter_id uuid not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (round_id, reporter_id)
);

comment on table public.photo_reports is
    'Deliberately carries no free-text reason and no copy of the image. A report skips the round and flags the asset for immediate purge; it is not a moderation queue for humans to browse.';

-- ── Housekeeping ────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

drop trigger if exists game_rooms_touch on public.game_rooms;
create trigger game_rooms_touch before update on public.game_rooms
    for each row execute function public.touch_updated_at();
