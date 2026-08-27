# NGN — Next Gen News

**Understand what's happening. Decide what you think.**

A politically neutral news product built for high-school and college-age
readers. Most political coverage assumes you were already following along; NGN
explains the process, the vocabulary and the range of views, then leaves the
conclusion to the reader.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase and
the Anthropic Claude API. Deployable to Vercel.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No credentials are required.** With no
environment variables set the app runs on seeded demo content, a mock AI
provider, and a local demo session — every page and interaction works.

Copy `.env.example` to `.env.local` to connect the real services:

| Variable | Effect when set |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real accounts, persisted comments, reactions and newsroom edits |
| `ANTHROPIC_API_KEY` | "I don't get it", Ask NGN and GENERATE DRAFT call Claude instead of the mock provider |
| `NEWS_API_KEY` | Enables the daily story-collection job in `lib/news/pipeline.ts` |

## Routes

| Route | What it is |
| --- | --- |
| `/` | Homepage — hero with "In 20 seconds", today's brief, issue guides, the Weekly, student voices |
| `/today` | The daily brief: five stories ranked by significance, with reading progress |
| `/story/[slug]` | The article experience (see below) |
| `/politics` | Every published story, filterable by topic |
| `/issues`, `/issues/[slug]` | The Issues Library — 12 neutral background guides |
| `/weekly`, `/weekly/[slug]` | The NGN Weekly — one signed editor's article each week |
| `/discuss`, `/discuss/[slug]` | Moderated student discussion |
| `/search` | Universal search across stories, issues, Weekly editions and discussions |
| `/about` | Editorial standards, corrections, privacy, how AI is used |
| `/login`, `/signup`, `/profile` | Accounts (Supabase, with a demo session fallback) |
| `/admin` | The newsroom — protected, editors only |

## The article page

Each story carries: the quick version (what happened / why it matters / what
happens next), the full article, **Understand the Sides** (Democratic,
Republican and other perspectives, with the disclaimer that parties contain a
wide range of views), what we know, what's still unclear, key terms, and source
cards. Plus two AI-backed features:

- **"I don't get it"** — a panel offering the 60-second version, the
  background, an explanation from scratch, or definitions of the terms used.
- **Ask NGN** — a question box answered only from the article and its approved
  sources.

Both are served by `lib/ai`. Without an API key they return responses assembled
from the article's own fields, so nothing is fabricated either way.

## Editorial rules, enforced in code

- **AI never publishes.** `app/admin/actions.ts` blocks any status change to
  approved / scheduled / published without an explicit human-review
  confirmation, and the `articles_require_human_approval` trigger in
  `supabase/schema.sql` rejects the same transition at the database level.
- **No "Democrats believe".** The publishing checklist fails a draft that uses
  that construction; house style is "many Democratic lawmakers argue".
- **Two sources minimum**, and uncertainty is a required section rather than an
  omission.
- **No outrage mechanics.** There is no angry reaction, no engagement ranking,
  no follower counts. Stories are ordered by editorial significance.
- **Privacy first.** Readers may be minors: email is never displayed, school
  and grade are optional and never public, and the moderation pass holds
  anything resembling contact information.

## Project structure

```
app/
  (site)/          reader-facing routes
  (auth)/          sign in, sign up, session actions
  admin/           the newsroom (protected)
  api/ai/          explain + ask endpoints
components/
  news/ article/ issues/ weekly/ discussion/ admin/ layout/ ui/
lib/
  ai/              Claude service abstraction + mock provider
  content/         seeded demo content and the repository interface
  news/            daily briefing pipeline (fetch → sources → draft → review)
  moderation/      submission screening and its server actions
  supabase/        clients that degrade gracefully when unconfigured
  admin/           editor serialization helpers
supabase/          schema.sql + setup notes
types/ngn.ts       domain types shared by everything
```

Every content read goes through `lib/content/repository.ts`, whose functions
are async precisely so they can be swapped for Supabase queries without
touching a single component.

## Demo content

All stories in this build are illustrative examples about real, ongoing policy
processes — how appropriations work, what an immigration bill contains, why
inflation and price levels differ. They are labelled `Demo` in the interface
and carry a notice on the article page. Source cards are placeholders marked
"link pending" rather than fabricated citations.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build + typecheck
npm run lint    # eslint
npm start       # serve the production build
```
