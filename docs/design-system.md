# The NextRep design system

One system, three shells. This document is the specification; `app/globals.css`
is the implementation, and the two are meant to be read together.

## The idea the system is built on

**A real game moment freezes just before the decision.**

Everything below follows from that sentence. The accent colour is the freeze
marker and is spent on almost nothing else. Display type has the proportions of
a number on a jersey. Motion exists only to report that the film stopped, that a
stage advanced, that a rep was graded. The marketing page does not illustrate
the product — it embeds it, running, in the product's own shell.

## Shells

Three shells, differing **only** in surface brightness and density. Type scale,
spacing, radii, control shapes, accent, status colours, focus treatment and
motion are identical across all three.

| Shell | Class | Used on | Canvas |
| --- | --- | --- | --- |
| Marketing | `.shell-marketing` | `/`, `/login`, `/signup` | `#FFFFFF` |
| Application | `.shell-app` | dashboard, film library, upload, processing, results, 404, error | `#F3F4F6` |
| Film room | `.shell-film` | `/sessions/[id]`, `/studio/[gameId]`, and the two embedded frames on `/` | `#0D0E12` |

The film room is dark for a functional reason, not a stylistic one: a bright
surround raises the adaptation luminance of the eye and flattens the perceived
contrast of the frame you are trying to read. It is therefore confined to the
routes where a video is the object of the work. The homepage embeds that same
dark shell so a visitor meets the film room before they ever navigate into it.

`components/app/app-shell.tsx` picks the shell from the pathname;
`.is-document` on the outermost wrapper tells the stylesheet which shell owns
the overscroll gutter, so an embedded dark frame on a light page cannot darken
the document.

## Colour

Nineteen role tokens. A component never names a value — it names a role, and the
shell supplies the value. That is the mechanism that makes one brand span a
white page and a black workspace.

| Role | Marketing | Application | Film room |
| --- | --- | --- | --- |
| `canvas` | `#FFFFFF` | `#F3F4F6` | `#0D0E12` |
| `surface` | `#FAFAFB` | `#FFFFFF` | `#131519` |
| `raised` | `#F3F4F6` | `#F3F4F6` | `#1A1D24` |
| `sunken` | `#E7E8EC` | `#E7E8EC` | `#08090C` |
| `line` | `#E7E8EC` | `#E7E8EC` | `#262A33` |
| `line-strong` | `#D3D5DB` | `#D3D5DB` | `#363B46` |
| `fg` | `#191B21` | `#191B21` | `#F3F4F6` |
| `fg-soft` | `#585C66` | `#585C66` | `#B4B8C1` |
| `fg-faint` | `#6B6F79` | `#6B6F79` | `#8C8F98` |
| `solid` / `on-solid` | `#191B21` / `#FFFFFF` | same | `#F3F4F6` / `#0D0E12` |
| `accent` / `on-accent` | `#FFC300` / `#191B21` | same | same |
| `good` | `#17703D` | `#17703D` | `#4ADE80` |
| `bad` | `#C2321F` | `#C2321F` | `#FF7A6B` |
| `focus` | `#191B21` | `#191B21` | `#FFC300` |

**The accent is rationed.** Signal amber marks the freeze and its consequences:
the paused state on a frame, the freeze corner ticks, the decision timestamp in
Studio, the rule beside a prompt or a coaching cue, the active stage on the
homepage strip, a progress fill, the active item in the app nav. It is never a
button fill, never a link colour, never a background wash. There is deliberately
no accent button variant — a primary button is the inverted neutral (`solid`),
which flips automatically between shells.

Amber is only ever used as a *fill* with near-black text (`10.70:1`), never as
text or a hairline on a light ground, where it would sit at `1.61:1`.

### Measured contrast

Every text/ground pair the product actually renders, computed with the WCAG 2.x
relative-luminance formula:

```
17.21  fg on marketing canvas          17.53  film fg on film canvas
15.64  fg on application canvas        16.61  film fg on film surface
 6.69  fg-soft on marketing canvas      9.20  film fg-soft on film surface
 6.08  fg-soft on application canvas    8.49  film fg-soft on film raised
 5.03  fg-faint on marketing canvas     5.97  film fg-faint on film canvas
 4.57  fg-faint on application canvas   5.65  film fg-faint on film surface
 6.14  good on white                    5.22  film fg-faint on film raised
 5.58  good on application canvas      10.49  film good on film surface
 5.57  bad on white                     7.18  film bad on film surface
 5.06  bad on application canvas       11.99  amber focus ring on film canvas
10.70  on-accent text on amber         17.21  focus ring on white
17.21  on-solid text on a primary button (both shells)
```

Every one clears WCAG AA for body text (4.5:1); the focus ring clears the 3:1
required of a non-text indicator with a wide margin on all three shells.

**Stated honestly:** decorative hairlines (`line` at `1.4–1.7:1` against their
canvas) do not meet 3:1. They are not UI components and carry no information —
every boundary they draw is also carried by a surface-brightness change — so
1.4.11 does not apply to them. They were not raised to 3:1 because a system of
dark rules on white reads as a spreadsheet, which is the wrong product. This is
a deliberate, documented choice rather than an oversight.

## Typography

**Archivo** (variable, with the `wdth` axis) for everything, **IBM Plex Mono**
for every time value. Both via `next/font/google`, self-hosted at build time.

Geist was dropped. It is the default face of a generated Next.js application,
and nothing else on the page announces "template" as loudly. Archivo pushed to
118% width and set in caps has the proportions of a jersey number and a
scoreboard without being a novelty face.

| Utility | Size | Treatment |
| --- | --- | --- |
| `display-1` | `clamp(2.5rem, 6.2vw, 4.5rem)` | 700, `wdth` 118%, caps, `-0.02em`, lh 0.90 |
| `display-2` | `clamp(1.5rem, 3.1vw, 2.125rem)` | 700, `wdth` 115%, caps, `-0.015em`, lh 0.98 |
| `display-3` | `1.0625rem` | 700, `wdth` 112%, caps, lh 1.15 |
| `label-caps` | `0.6875rem` | 600, `wdth` 105%, caps, `+0.11em` |
| `timecode` | `0.75rem` | Plex Mono, tabular figures |
| body | `0.875rem` / `1rem` | 400–500, `leading-relaxed` for prose |

`display-1` is the page's single largest object and appears once per screen: the
homepage headline, the rep count on the dashboard, the score on the results
page. Every timestamp, duration, percentage and score fragment in the product
is `timecode` or `tabular-nums`, so numbers never shift as they change.

## Spacing, grid, radius, borders

- **Spacing** is Tailwind's 4px scale, used at 2 / 3 / 4 / 5 / 6 / 8 / 10 / 14.
- **Grid**: `page-shell` is a centred `75rem` column with `1.25rem` gutters
  (`2rem` from `40rem` up). `page-shell-narrow` is the same at `46rem`, used for
  single-task pages — upload, processing, auth, 404.
- **Radius**: three, semantic. `rounded-control` 4px (buttons, inputs, chips),
  `rounded-panel` 6px (cards, lists), `rounded-frame` 10px (anything containing
  a video).
- **Borders** are always 1px `line`, except the decision rule (3px `accent`) and
  the freeze corner ticks (2px `accent`). Lists are drawn as a single bordered
  block with `border-b` rows rather than as a stack of separate cards, which is
  what stopped the app screens reading as a pile of boxes.

## Controls

**Buttons** — three variants, one shape (`rounded-control`, 600 weight,
`transition-[color,background-color,border-color]` at 150ms).

| Variant | Fill | Use |
| --- | --- | --- |
| `primary` | `solid` / `on-solid` | the one action a screen exists for |
| `secondary` | `surface` + `line-strong` border | everything alongside it |
| `ghost` | text only, `raised` on hover | transport controls, nudges, dismissals |

Sizes are `sm` 32px, `md` 40px, `lg` 44px. Disabled is `opacity-40` on the same
fill — the previous system produced an olive button, which read as a colour
rather than as a state.

The transition property list is explicit rather than `transition-colors`,
because in Tailwind v4 `transition-colors` also animates `outline-color`, which
makes the focus ring fade in from the element's text colour.

**Inputs** (`components/ui/field.tsx`) — 40px, `rounded-control`, `bg-canvas`
inside a `bg-surface` panel so a field reads as a well, `line-strong` border,
`fg-faint` on focus, and a `label-caps` label above. One shape for text inputs,
selects and textareas.

**Chips** (`components/ui/chip.tsx`) — `label-caps`, `rounded-xs`, five tones:
`neutral`, `quiet` (outline), `accent`, `good`, `bad`. `StatusDot` is the quiet
alternative for table rows, where a filled chip per row would be shouting.

## Status

Correct / missed / skipped, ready / processing / failed, published / draft are
all expressed the same way everywhere: a chip or a dot in `good`, `bad` or
`fg-faint`, plus a word. Never colour alone.

Honest states are part of the design, not fine print: fixture mode carries a
labelled banner on the film library and the upload flow; the demo film is
labelled "animated re-creation, not uploaded film" in the hero frame's caption,
in the footer, and on the seeded processing screen.

## Video surfaces

A video always sits in a `rounded-frame` container with a `#08090C` letterbox
(fixed, not a token — it is behind a picture, not a surface). Chrome sits above
and below the frame, never on it, because the demo film carries its own clock
bug in the top-left corner and because that is what the real session does.

**The freeze mark** (`components/video/freeze-marks.tsx`) is the product's one
recurring ornament: four 2px amber corner ticks plus a 20%-opacity amber inset
hairline, drawn over the frame in exactly one state — the film paused at a
decision. `decision-mark` is its flat counterpart: a 3px amber rule against the
prompt, the coaching cue, the next-game focus and the Studio freeze timestamp.

## Motion

`--ease-signal: cubic-bezier(0.2, 0, 0, 1)`, 150ms for controls, 200–300ms for
state. Motion is only ever used to report a state change: the freeze appearing,
a stage lighting up, a progress bar filling, a reveal panel arriving. There is
no entrance animation, no parallax, no scroll-triggered reveal, no looping
decoration. `prefers-reduced-motion: reduce` collapses every duration to 0.01ms,
and the hero preview stops looping and holds on the frozen frame instead.

## Icons

There are none. Every affordance in the product is a word, a timecode, a chip or
a rule. A sports product with a mixed bag of stroke icons is a product that
looks like it was assembled from an icon set — and none of the actions here
(Set to playhead, −0.1s, Publish rep, Take reps) have an unambiguous glyph.
The one non-typographic mark is the amber rule, and it means one thing.

## Marketing shell

Sticky 56px header: wordmark, How it works, For players, Sign in, and a small
primary `Try a rep`. The page is white, ruled by full-width hairlines between
sections, and holds one `display-1`. Sections alternate `canvas` and `surface`
by one step of brightness rather than by a colour change.

The interactive proof is a **full-bleed film-shell band** inside the light page:
the visitor scrolls out of the marketing surface and into the product's own
room, plays a real rep there, and only then clicks through. That band is the
answer to "the homepage and the application feel like different products" — the
homepage now contains the application.

No logo wall, no testimonial, no metric we cannot substantiate, no pricing
table. The working product is the proof.

## Application shell

Sticky 56px header, identical geometry to the marketing one: wordmark,
Dashboard, Film, a primary `Upload film`, and the account control. The active
nav item is marked with a 2px amber underline. The header stays mounted in the
film room and re-colours with it, so a player in a session is never stranded on
a screen with no way back.

Pages open with `PageHeader`: a `label-caps` locator, one `display-2` heading,
an optional meta line, an optional sentence of context, and the page's actions
on the right, over a single hairline. Every application route uses it, which is
what makes them read as one product rather than six.
