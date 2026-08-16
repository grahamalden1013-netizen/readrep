# ReadRep Design System

The visual language for ReadRep, and the rules that keep every new screen
feeling like it belongs to the same product. Tokens live in
`app/globals.css`; components live in `components/ui/`.

## Why dark-first, and only dark for now

Dark is the primary and, for this pass, the *only* shipped theme —
`:root` defines dark values directly, there's no light-mode override. This
was a deliberate scope decision, not an oversight: every product named as
visual inspiration (Linear, Arc, Vercel/Stripe dashboards, Hudl, Riverside)
is dark-native, and building one theme to a high bar beats spreading the
same effort across two half-finished ones.

**To add light mode later:** the token architecture already supports it.
Add a `@media (prefers-color-scheme: light)` block (or a `[data-theme="light"]`
override) that redefines the same custom property names in `:root` with
light values — every component reads the tokens, not literal colors, so
nothing downstream needs to change.

## Colors

All tokens are CSS custom properties in `:root`, re-exposed as Tailwind
utilities via `@theme inline` (e.g. `--color-primary` → `bg-primary`,
`text-primary`, `border-primary`).

| Token | Value | Use |
|---|---|---|
| `background` | `#0a0b0d` | Page canvas |
| `surface` | `#131519` | Cards, panels |
| `surface-2` | `#191c21` | Hover/elevated surface, form fields |
| `surface-3` | `#21252b` | Active/pressed surface, avatars |
| `overlay` | `#16181c` | Modal body ground |
| `border` | `#24282f` | Default hairline |
| `border-strong` | `#33383f` | Emphasized border, form field borders |
| `foreground` | `#f2f3f5` | Primary text |
| `muted-foreground` | `#a0a7b0` | Secondary text |
| `faint-foreground` | `#6b7280` | Tertiary text, timestamps |
| `primary` | `#fb7a2f` | Links, icons, text-sized accents on dark ground |
| `primary-fill` | `#c2410c` | Filled button background (deep enough for white text at AA contrast) |
| `primary-soft` | `#2b1b10` | Badge/wash backgrounds |
| `success` / `warning` / `danger` / `info` | green / gold / red / sky | Semantic states — **never** reused as the brand accent, and never used interchangeably with `primary` |

The accent is a warm amber-orange — distinct from the cool graphite base,
and a deliberate nod to the film/broadcast register of the product's
domain without literally being "basketball orange." Semantic colors sit on
different hues from the accent on purpose, so a warning badge is never
confused for a brand highlight.

## Spacing

No custom scale — Tailwind's default 4px-based spacing (`gap-1` = 4px
through `gap-16` = 64px) is used consistently. Consistency here comes from
component discipline, not a redefined scale: cards use `px-5 py-5`, list
rows use `px-4 py-3`, page containers use `px-8 py-10`. Match the nearest
existing component rather than inventing a new spacing value.

## Border radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 6px | Focus outlines, small chips |
| `radius-md` | 10px | Buttons, inputs, badges' inner corners |
| `radius-lg` | 14px | Cards, list rows, panels |
| `radius-xl` | 20px | Modals |

## Elevation

Dark surfaces can't rely on black box-shadows the way light UIs do — a
black shadow on a near-black background is invisible. Elevation here comes
from **surface stepping** first (`surface` → `surface-2` → `surface-3`,
each literally lighter/closer to the viewer), with shadow tokens as a
secondary cue:

| Token | Use |
|---|---|
| `shadow-sm` | Resting cards, buttons |
| `shadow-md` | Hover states |
| `shadow-lg` | Modals |
| `shadow-glow` | Accent-colored glow, reserved for primary CTA emphasis |

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 120ms | Hover/active state changes |
| `duration-base` | 200ms | Default transitions |
| `duration-slow` | 340ms | Entrance animations (`.rr-animate-in`) |
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default easing — fast start, gentle settle |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric transitions |

`prefers-reduced-motion: reduce` collapses all animation durations to
near-zero globally (see `globals.css`) — this is handled once, at the
token layer, so individual components never need their own guard.

## Typography

**Geist Sans** (UI, body) and **Geist Mono** (timestamps, codes, tabular
figures) — both already self-hosted via `next/font/google`. Geist is
Vercel's own typeface, which made it the right pick for "feel like a
premium dev-tool SaaS" without adding a new font dependency or fetch risk.

UI text runs dense and deliberate rather than off a generic scale:

| Context | Size | Weight |
|---|---|---|
| Page title | 22px | 600 |
| Card title | 15px | 600 |
| Body / form labels | 13–14px | 400–500 |
| Meta / captions | 11.5–12.5px | 400–500, often uppercase + tracked for section labels |
| Landing headline | 44–60px (responsive) | 600, `text-wrap: balance` |

Numbers that line up in a column (timestamps, dates, invite codes) always
use `font-mono` with `tabular-nums` where relevant.

## Components (`components/ui/`)

- **Button** / **LinkButton** — `variant`: `primary` (filled accent),
  `secondary` (surface + border), `ghost` (text-only), `destructive`.
  `size`: `sm` / `md` / `lg`. `LinkButton` exists as a separate component
  rather than an `asChild` polymorphism specifically to avoid nesting an
  `<a>` inside a `<button>` — invalid HTML that also breaks Next.js
  client-side navigation.
- **Card** / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`
  / `CardFooter` — the one panel primitive. Used for every bordered
  container that isn't a list row or an empty state.
- **Field** / **Input** — `Field` owns the label, optional hint, and error
  text, and wires `aria-describedby` automatically; it takes a render-prop
  child so the id/describedby can be threaded into any input-like control.
- **Badge** — `tone`: `neutral` / `primary` / `success` / `warning` /
  `danger` / `info`. Status pills, never used for the brand accent alone.
- **Table** / `TableHead` / `TableBody` / `TableRow` / `TableHeaderCell` /
  `TableCell` — used for the coach roster and games list. Scrolls
  horizontally in its own container on narrow viewports rather than
  letting the page scroll sideways.
- **EmptyState** — icon in a soft circle, title, optional description,
  optional action. Dashed border reserved specifically for *actionable*
  empty prompts (like "join your team"); `EmptyState` itself uses a solid
  dashed treatment for "nothing here yet, and that's expected."
- **Skeleton** / `SkeletonText` / `SkeletonCard` — a shimmering gradient
  (`rr-shimmer` keyframe), respects `prefers-reduced-motion`. Wired into
  real Next.js `loading.tsx` route boundaries for `/dashboard` and
  `/coach`, not just a static mockup.
- **Alert** — `tone`: `danger` / `warning` / `success` / `info`. Used for
  form-level errors passed back through redirect `?error=` params.
- **ErrorState** — used inside `app/error.tsx`, the root error boundary.
- **Modal** — built on the native `<dialog>` element rather than a
  hand-rolled focus trap: free Escape-to-close, focus containment, and
  `::backdrop` styling. Used for the coach's "share invite code" action.
- **VideoPlayerDemo** — presentational chrome for the future film player:
  frame, control bar, scrubber with a decision-point marker, and a
  "predict" overlay state. **Not wired to a real `<video>` element or
  Supabase data** — that's the actual session-player feature (pause at
  `clips.decision_timestamp_ms`, write a `predictions` row), which is
  separate, larger work. This component exists so the visual language for
  that feature is decided in advance, and doubles as the landing page's
  hero demo.

## Charts

No chart component exists yet because there's no numeric/trend data
anywhere in the product yet (no completed sessions, no accuracy history).
Rather than build one against fabricated numbers, the rule is written down
for whenever real data shows up: charts use the semantic tokens
(`success`/`warning`/`danger`/`info`), never the `primary` accent, since
`primary` is reserved for brand/navigation and would visually compete with
data. Gridlines at `border` opacity, not `border-strong`. Emphasize the
current/latest data point, not the whole series equally.

## Navigation

A fixed-width (`--shell-sidebar-w`, 248px) left sidebar in `(app)/layout.tsx`:
logo, role-aware nav (coaches see "Team", players see "Sessions" — not a
generic "Dashboard" label for both, since they're genuinely different
destinations), and a user identity block with sign-out pinned to the
bottom. Auth-gated server-side in the layout itself as defense-in-depth
alongside `proxy.ts`'s route-level check.

## Accessibility notes

- Every interactive element has a visible `:focus-visible` ring
  (`--ring`, 2px offset) — defined once, globally, in `globals.css`.
- Form errors are associated via `aria-describedby` (`Field` component)
  and `Input` carries `aria-invalid` styling.
- `Modal` uses native `<dialog>` for its accessibility semantics rather
  than reimplementing them.
- Color is never the only signal: badges pair color with an icon
  (`CheckCircle2` vs `Circle` for session status), not tone alone.
