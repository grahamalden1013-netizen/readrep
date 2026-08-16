# ReadRep

Turn game film into decision-making reps. Film pauses at the decision
point, the player predicts the read, the real play plays out, and the
player gets coaching feedback on it.

## Stack

Next.js 16 (App Router, Turbopack) · Tailwind v4 · Supabase (Postgres,
Auth, RLS)

## Getting started

```bash
npm install
npm run dev
```

Requires a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — see `.env.example`.

## Structure

- `app/(marketing)` — public landing page
- `app/(auth)` — login, signup, email confirmation
- `app/(app)` — authenticated shell (sidebar) and role-gated pages
  (`/dashboard` for players, `/coach` for coaches)
- `lib/<domain>/queries.ts` — one query layer per domain (`profile`,
  `sessions`, `teams`), typed against `types/database.ts`
- `components/ui/` — the design system's primitives

## Design system

See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) for tokens
(color, spacing, radius, elevation, motion, typography) and component
conventions.
