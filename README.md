# NextRep

**Turn your game film into reps.**

NextRep pauses a player's own game film a beat before a decision and asks them to
make the read again. Then it shows what they actually did, what the better read
was, and one cue to carry into the next game.

```
UPLOAD → PLAYABLE ASSET → MARK DECISION → AUTHOR REP → PREVIEW → PUBLISH → PLAY
```

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. **No configuration is required.** The seeded demo
game and its five reps ship with the repo and run with no account, no database
and no video host. Uploading your own film needs the setup below.

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server (Turbopack)          |
| `npm run build`     | Production build                |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test`          | Unit tests (`node --test`)      |

## Routes

| Route                            | What it is                                            |
| -------------------------------- | ----------------------------------------------------- |
| `/`                              | Landing page                                           |
| `/dashboard`                     | Player home — next session, last result, focus cue     |
| `/games/new`                     | Upload → identify player → confirm → direct upload     |
| `/games/[gameId]/processing`     | Real asset status from the video host                  |
| `/studio`                        | Games ready to mark up                                 |
| `/studio/[gameId]`               | Author a rep: scrub, capture timestamps, preview, publish |
| `/sessions/[sessionId]`          | The rep session — any number of reps                   |
| `/sessions/[sessionId]/complete` | Results                                                |
| `/api/mux/webhook`               | Signed provider webhooks                               |
| `/login`, `/signup`              | Accounts, when Supabase is configured                  |

## Architecture

Two swappable boundaries sit behind everything:

- **Video provider** (`lib/video/`) — direct-upload creation, upload and asset
  status, playback, webhook verification, deletion, and normalized errors.
  `MuxVideoProvider` is the real one; `FixtureVideoProvider` is a labelled local
  stand-in. `getVideoConfig()` picks between them and **refuses to fall back to
  fixtures in production** — uploads are disabled with a clear reason instead.
- **Content backend** (`lib/db/`) — games, video assets, reps, answer choices
  and the webhook event log. `SupabaseContentBackend` is the real one;
  `FileContentBackend` writes to `.nextrep-data/` and is development-only.

Sessions are deliberately not in either: they are anonymous and per-device, so
they live in a signed `httpOnly` cookie. That is what lets the demo run with no
account. Games and reps never do — real film always goes to a backend.

**Webhooks are treated as best-effort.** They can be late, dropped, delivered
out of order, or not configured at all, so the processing page also polls. Both
paths converge on `lib/video/sync.ts`, which merges by status rank so a late
event cannot walk a ready asset backwards.

**The answer never reaches the browser early.** `toPublicRep()` strips the
correct choice, the actual decision, the outcome, the explanation and the cue.
The reveal only comes back from the server action that records the answer.

## Setting up real uploads

### 1. Supabase

1. Create a project (or use an existing one).
2. Apply `supabase/migrations/0001_nextrep.sql` — `supabase db push`, or paste it
   into the SQL editor.
3. **Add `nextrep` to Settings → API → Exposed schemas.** The tables live in
   their own schema so they cannot collide with anything else in the project;
   PostgREST will not serve them until the schema is exposed.
4. Copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service role). Server-only.
     Needed **only** for webhooks: a webhook carries no user session, so
     row-level security would otherwise hide every game from it.
5. Sign up in the app. Uploads require an account once Supabase is configured —
   film is private, and RLS scopes every row to `games.owner_id = auth.uid()`.

### 2. Mux

1. Mux dashboard → Settings → Access Tokens → new token with **Mux Video** read
   and write. Put the id and secret in `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`.
2. Settings → Webhooks → add `https://<your-host>/api/mux/webhook`. Copy the
   signing secret into `MUX_WEBHOOK_SECRET`.
   - Locally, expose port 3000 with a tunnel and point the webhook there.
   - Without the secret the webhook route returns 503 and status still resolves
     by polling — slower, but not broken.
3. Restart `npm run dev`. `/games/new` should no longer show the fixture notice.

New uploads use Mux's `basic` video quality tier, which is the cheapest option.

### Uploading the first real game

1. Go to `/games/new`, drop in an `.mp4`, `.mov`, `.m4v` or `.webm` (up to 6 GB).
2. Enter jersey number, team colour, and anything else that identifies the player.
3. Enter title, opponent and date, then **Upload and analyze**.

The file goes straight from the browser to Mux with a `PUT` and real progress —
it never passes through a server function. You can cancel mid-upload (the game
is removed) or retry after a failure. The processing page then reports the real
asset state until it is ready.

### Authoring and publishing the first rep

1. From the processing page (or `/studio`), open the ready game.
2. Scrub the real video. Use **Set to playhead** to capture **clip start**,
   **decision pause** and **clip end**, and `±0.1s` to place them exactly.
3. Fill in title, skill category, prompt, two to four answer choices, the best
   read, what the player actually did, the outcome, the explanation and the cue.
4. **Save draft** to come back later, **Preview** to run the real player against
   your unsaved draft, **Publish rep** when it is right.
5. **Take this session** plays it exactly as a player gets it.

Publishing is gated on `0 <= clipStart < decisionPause < clipEnd <= duration`,
checked in the studio, again in the server action, and again by a database
`CHECK` constraint.

## Fixture mode

With no Mux credentials, development uses a fixture pipeline that is labelled
everywhere it appears:

- Your file is streamed and measured, so upload progress is real, then
  discarded. Fixture playback is the committed demo film, never your footage.
- The asset walks `waiting → asset_created → preparing → ready` on a timer.
- Signature verification, the replay window and event idempotency are the same
  code the real provider uses.
- Authored games and reps go to `.nextrep-data/` (git-ignored).

Fixture mode exists so the whole ready → studio → session flow can be exercised
without credentials. It is disabled outside development.

## The demo film

`public/demo/dragons-film.{webm,mp4}` is an **animated re-creation**, not real
game footage — it says so in the corner of every frame and in the UI. It is
rendered from `scripts/demo-film/choreography.mjs`, which is also the source of
the seeded rep timestamps, so the action at each decision point genuinely
matches the prompt. `test/seed.test.ts` fails if the two drift apart.

To re-render after changing the choreography:

```bash
mkdir -p /tmp/nextrep-film && cd /tmp/nextrep-film
npm install playwright ffmpeg-static && npx playwright install chromium
cd -
NODE_PATH=/tmp/nextrep-film/node_modules node scripts/demo-film/render.mjs
```

The output is committed, so this is only needed when the choreography changes.

## Environment

See `.env.example`. Everything in it is optional; nothing is required for the
seeded demo. `SUPABASE_SERVICE_ROLE_KEY`, `MUX_TOKEN_SECRET` and
`MUX_WEBHOOK_SECRET` are server-only and must never be prefixed with
`NEXT_PUBLIC_`. `.env*` is git-ignored apart from `.env.example`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) ·
Tailwind CSS v4 · Zod · Supabase · Mux · hls.js
