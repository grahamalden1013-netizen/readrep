# NextRep

**Turn your game film into reps.**

NextRep pauses a player's own game film a beat before a decision and asks them to
make the read again. Then it shows what they actually did, what the better read
was, and one cue to carry into the next game.

```
UPLOAD → IDENTIFY PLAYER → FIND MOMENTS → DECIDE → REVEAL → LEARN
```

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. **No configuration is required** — the seeded demo
game and its five reps ship with the repo, and the whole loop runs end to end
with no account, no database and no video host.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                |
| `npm run build`     | Production build                      |
| `npm run lint`      | ESLint                                |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`       |
| `npm test`          | Unit tests (`node --test`)            |

## Routes

| Route                              | What it is                                              |
| ---------------------------------- | ------------------------------------------------------- |
| `/`                                | Landing page                                             |
| `/dashboard`                       | Player home — next session, last result, focus cue       |
| `/games/new`                       | Upload → identify player → confirm                       |
| `/games/[gameId]/processing`       | Analysis stages, or "review required" for uploads        |
| `/sessions/[sessionId]`            | The five-rep session — the core screen                   |
| `/sessions/[sessionId]/complete`   | Results                                                  |
| `/studio`                          | Internal: validate a rep draft against the real schema   |
| `/login`, `/signup`                | Accounts, when Supabase is configured                    |

## How V1 actually works

NextRep does not do automated basketball analysis yet, and the product never
claims it does.

- **Reps are authored, not detected.** The five demo reps live in
  `lib/reps/seed.ts`, validated by Zod at module load. `/studio` validates a
  draft against the same schema and hands back canonical JSON to paste in.
- **The processing screen is honest.** For the seeded game it says outright that
  the reps were prepared by hand. An uploaded game gets no reps and lands in a
  "review required" state instead of a fabricated analysis.
- **Uploads record the game, not the file.** No video host is configured, so
  `/games/new` saves the title, opponent, date and player identity, and says
  plainly that the file stayed on the device.
- **Progress lives in a signed cookie.** `lib/store/` keeps the last few games
  and sessions in an httpOnly cookie, validated on every read. That is what
  makes the demo work with no account and survive a refresh.

The data model (`lib/reps/schema.ts`) is shaped for the eventual real thing:
games, player identities, analysis jobs with a `method`, reps with categories
and timestamps, sessions, responses and skill results.
`supabase/migrations/0001_nextrep.sql` provisions the same model in Postgres
with row-level security, for when sessions need to be durable and cross-device.

## The demo film

`public/demo/dragons-film.{webm,mp4}` is an **animated re-creation**, not real
game footage — it says so in the corner of every frame and in the UI. It is
rendered from `scripts/demo-film/choreography.mjs`, which is also the source of
the rep timestamps, so the action at each decision point genuinely matches the
prompt. `test/seed.test.ts` fails if the two ever drift apart.

To re-render after changing the choreography:

```bash
mkdir -p /tmp/nextrep-film && cd /tmp/nextrep-film
npm install playwright ffmpeg-static && npx playwright install chromium
cd -
NODE_PATH=/tmp/nextrep-film/node_modules node scripts/demo-film/render.mjs
```

The output is committed, so this is only needed when the choreography changes.

## Environment

See `.env.example`. Everything in it is optional; nothing is required to run the
demo. Secrets are server-only — only `NEXT_PUBLIC_SUPABASE_*` reach the browser,
and both are publishable by design.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) ·
Tailwind CSS v4 · Zod · Supabase (optional, auth only in V1)
