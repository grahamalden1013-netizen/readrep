# NGN — Next Gen News

**NGN Arena** is a competitive debate platform for students. Read a neutral
briefing on a real civic question, take a position, argue it against another
student across structured rounds, get scored on how you argued — then make the
strongest case for the side you argued against.

> Don't just have an opinion. Defend it.

## The one rule

NGN never decides which political position is correct. It scores how an
argument is built: evidence, reasoning, rebuttal, clarity, understanding of the
opposing view, and civility. Two students making opposite arguments of equal
quality receive equal scores.

That rule is enforced in three places, not just asserted in copy:

- **`lib/ai/neutrality.ts`** — a single shared contract that every AI service
  composes on top of. It forbids ranking ideologies, forbids letting a viewpoint
  move a score, requires that party positions be presented with their internal
  disagreements, and forbids inventing evidence.
- **The scoring weights** — Understanding Opponent is 20%, exactly equal to
  Evidence. A student who ignores the other side cannot reach the top of the
  ladder by arguing forcefully. Civility is only 5%: enough to make contempt
  costly, not enough to make politeness a strategy.
- **The data model** — there is no field anywhere that stores a student's
  ideology in a form another user, a teacher, or the matchmaker can read.
  Matching uses rating, side and format only.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No configuration is required.** Both external
services are optional:

| Missing | What happens |
| --- | --- |
| `ANTHROPIC_API_KEY` | Every AI service falls back to a deterministic local implementation. The judge, perspective judge, explainer, moderation and draft generator all still work — the judge analyses real construction signals (citation markers, causal connectives, term overlap with the opponent, steelman phrasing, incivility) rather than returning canned text. |
| Supabase env vars | The app runs in demo mode. Arena state lives on the device via `useSyncExternalStore`, and all content is served from `data/demo`. |

Copy `.env.example` to `.env.local` to enable either.

## The critical journey

This works end to end, today, with no configuration:

```
homepage → briefing → choose a position → matchmaking → four debate rounds
  → AI scoring → result + rating change → Switch Sides → Perspective Score
  → profile updates → leaderboard reflects the new rating
```

`scripts/verify-journey.mjs` drives that whole path in a real browser and
checks every breakpoint from 320px up for horizontal overflow:

```bash
npm run build && npx next start -p 3100 &
npm install --no-save playwright
node scripts/verify-journey.mjs
```

## Structure

```
app/
  (site)/          Public product — homepage, arena, today, issues, parties,
                   discuss, rankings, profile, classroom, admin
  (auth)/          Login and signup
  actions/         Server actions: AI judging, moderation, admin drafting
components/
  arena/  debate/  ratings/  news/  discuss/  classroom/  admin/
  explain/         The "I Don't Get It" panel
  providers/       Arena state context
  shell/  ui/      Navigation, footer, shared primitives
lib/
  ai/              Neutrality contract, judge, perspective judge, explainer,
                   moderation, source analysis, draft generator, provider
  arena/           Elo, divisions, formats, badges, matchmaking, profile, store
  search/          Cross-content search index
  supabase/        SSR client (optional — see above)
data/demo/         Seeded content. See data/demo/README.md
supabase/          schema.sql — full schema with RLS policies
types/ngn.ts       The domain model everything shares
```

## Design

Premium editorial rather than gamified: cream and charcoal, a restrained lime
accent, Fraunces for headlines, Inter for interface, JetBrains Mono wherever a
number needs to hold its column. Debate positions use a teal/clay pair rather
than red and blue, so the interface never colour-codes a side as a party.

## Demo content

Everything in `data/demo` is seeded. Every debate question and article covers a
durable civic question rather than a breaking event, so nothing can be mistaken
for a report of something that happened today. Sources point at real, stable
government and research pages. Participation figures are invented and carry a
`DemoBadge` wherever they appear. See `data/demo/README.md`.
