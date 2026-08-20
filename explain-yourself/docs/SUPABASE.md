# Supabase setup

## First time

```bash
supabase init                        # if the project has no supabase/ config yet
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                     # applies migrations 0010 … 0050 in order
```

Then, in the dashboard:

1. **Authentication → Providers → Anonymous sign-ins: on.** This is the whole
   account system for v1. Without it, nothing works.
2. **Authentication → Email: signup off.** Nothing here uses email.
3. Confirm **Storage → gameplay-photos** exists and is **not public**. Migration
   `0040_storage.sql` creates it that way and re-asserts `public = false` on
   conflict, but this is worth eyeballing once.

## Edge functions

```bash
supabase secrets set AI_PROVIDER=none
supabase functions deploy session
supabase functions deploy flavour
supabase functions deploy cleanup --no-verify-jwt
```

`cleanup` is deployed without JWT verification because it is invoked by a
scheduler, and guards itself with an explicit service-key check in its first
three lines.

`session` and `flavour` require a valid user JWT.

### Function environment

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | injected | |
| `SUPABASE_ANON_KEY` | injected | used to act *as the caller* |
| `SUPABASE_SERVICE_ROLE_KEY` | injected | reads and writes the authoritative state |
| `AI_PROVIDER` | you | `none` (default) or `anthropic` |
| `ANTHROPIC_API_KEY` | you | only if `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | you | defaults to `claude-sonnet-5` |

The `session` function uses two clients on purpose. Player-initiated actions run
through the **anon** client carrying the caller's `Authorization` header, so the
caller's own RLS applies and the database is the thing that says no. The
**service-role** client is used for exactly two jobs: reading the private state
and writing the next one. It never performs an action on behalf of a caller who
was not allowed to perform it.

## Cleanup schedule

If `pg_cron` is available (Dashboard → Database → Extensions), migration
`0050_cleanup.sql` schedules itself:

- every 15 minutes: `expire_abandoned_games()`
- daily at 04:30 UTC: `drop_purged_asset_rows()` and `drop_old_rooms()`

`expire_abandoned_games` only *marks* assets. Deleting the actual objects needs
the storage API, so the `cleanup` edge function does that. Point any scheduler at
it with the service key as a bearer token:

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/cleanup" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Local development

```bash
supabase start
make db-reset          # applies every migration from scratch
```

Point `ExplainYourself/Config/xcconfig/Secrets.xcconfig` at the local stack. For
testing on real phones use the Mac's LAN address rather than `localhost`, and
note that iOS requires HTTPS for non-local addresses — for LAN testing add an
`NSAppTransportSecurity` exception in a **debug-only** Info.plist, and never ship
it.

## Keys

| Key | Safe in the app? | Why |
|---|---|---|
| Project URL | Yes | It is a public hostname. |
| `anon` key | **Yes** | A public project identifier. Every RLS policy in this repo assumes an attacker has it. |
| `service_role` key | **Never** | It bypasses RLS entirely. Server environments only. |
| Database password | **Never** | CLI and migrations only. |

If a service-role key is ever committed, rotate it in the dashboard immediately —
removing the commit is not enough, because the value is in the reflog and in
every clone.

## Schema notes

`game_session_private` is a separate table from `game_sessions` rather than a
column on it. Realtime publishes whole rows, so keeping the authoritative state
(which contains owner ids for concealed rounds and is joined to the secrets) in
an **unpublished** table is a real control. A revoked column would rely on
Realtime honouring column-level grants, which is not something to bet a game
mechanic on.

`approved_game_assets` is the only table that references a photo, it only ever
holds rows for photos a human tapped KEEP on, and every row has an `expires_at`.

## Migration order

| File | What |
|---|---|
| `0010_init.sql` | tables, indexes, triggers |
| `0020_rls.sql` | row-level security, grants, the realtime publication |
| `0030_functions.sql` | the `SECURITY DEFINER` actions clients may call |
| `0040_storage.sql` | the private bucket and its policies |
| `0050_cleanup.sql` | retention functions and the cron schedule |

They are ordered so that a partial apply fails closed: RLS is enabled before any
function that could expose data exists.
