# Homework Agent

A personal school planner. It reads the Schoology feed already synced into your
Google Calendar, works out what is due and how hard it will be, and builds a
realistic study plan around the time you actually have free.

It never connects to Schoology directly — **Google Calendar is the source of
truth**, and access to it is **read-only**.

## Status

| Stage | Scope | State |
| ----- | ----- | ----- |
| 1 | App shell, database, authentication, Google Calendar connection | ✅ Done |
| 2 | Calendar discovery, read the Schoology feed, list raw assignments | ⬜ Next |
| 3 | Assignment parsing, classification, local status, syncing | ⬜ |
| 4 | Daily planner and free-time detection | ⬜ |
| 5 | Test preparation scheduling | ⬜ |
| 6 | Study Coach assistant | ⬜ |
| 7 | UI polish, mobile, error handling, deployment | ⬜ |

Stage 1 also ships the calendar-selection screen, since it is what makes the
Google connection verifiable end to end.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · React 19 · Tailwind CSS v4 ·
PostgreSQL · Prisma 7 · Better Auth · Google Calendar API · Vercel

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a PostgreSQL database

Any Postgres 14+ instance works — local, Neon, Supabase, or Vercel Postgres.

```bash
createdb homework_agent
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`. Every variable is documented there. At minimum you need
`DATABASE_URL`, `DIRECT_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Generate the auth secret with:

```bash
openssl rand -base64 32
```

> `BETTER_AUTH_SECRET` also encrypts stored Google tokens at rest. Changing it
> signs everyone out and invalidates stored tokens.

### 4. Set up Google OAuth

In the [Google Cloud Console](https://console.cloud.google.com/):

1. Create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type **External**, publishing status **Testing** is fine for personal use.
   - Add your own Google account under **Test users**.
   - Add these scopes — both are read-only:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - Authorized redirect URI, exactly:
     - `http://localhost:3000/api/auth/callback/google`
     - and `https://<your-domain>/api/auth/callback/google` for production.
5. Copy the client ID and secret into `.env`.

### 5. Run migrations

```bash
npm run db:migrate
```

### 6. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with Google, and pick your calendars at
**Calendars**. The one carrying Schoology assignments is auto-detected by name,
but you always confirm it — calendar IDs are never hard-coded.

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:migrate` | Create and apply a migration (development) |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Browse the database |

## Data model

Google-owned data is mirrored, never mutated. Anything you decide — completion
status, priorities, planned study sessions — lives only in our database.

- `users` — account, timezone, planner preferences
- `calendar_sources` — selected Google calendars, each `SCHOOL` or `BUSY`
- `assignments` — parsed schoolwork, keyed by Google event ID for deduplication
- `study_sessions` — planned/completed study blocks
- `busy_blocks` — cached availability mirror from non-school calendars
- `chat_messages` — Study Coach history
- `users` / `sessions` / `accounts` / `verifications` — Better Auth

## Safety model

- Calendar scopes are **read-only**. The app cannot create, edit or delete
  calendar events, and Schoology events are never modified.
- The agent never submits work, sends mail, or takes any outward action.
- Google OAuth secrets are server-only (`lib/env.ts` is `server-only`); they are
  never bundled for the browser.
- OAuth tokens are encrypted at rest.
- Deleting an assignment from the Schoology feed marks it removed rather than
  destroying your local status.

## Deploying to Vercel

1. Push the repository and import it in Vercel.
2. Add every variable from `.env.example` to the project's environment.
   Set `BETTER_AUTH_URL` to the production URL.
3. Add the production callback URL to the Google OAuth client.
4. `npm run db:deploy` against the production database (or run it as a release
   step). The build itself runs `prisma generate`.
