# Route audit and intended route map

Phase 2 of the experience redesign. This is the state of every route *before*
the redesign, the specific defects found, and the route map the redesign is
built against. Written before any component was edited.

## How the audit was done

A production build was served locally and every route was driven with Playwright
at 1440×900. For each route the run captured a full-page screenshot plus the
computed `<body>` background and foreground, the `<h1>` list, every `href`, every
button label, document height and horizontal overflow. The session, reveal and
completion states were reached by actually playing the demo session rather than
by URL guessing, because a session id only exists once one has been created.

## What the audit found

### 1. The homepage and the application are two different products

This is the headline defect and it is literal, not impressionistic:

| Route | `<body>` background |
| --- | --- |
| `/` | `rgb(245, 242, 236)` — warm paper |
| `/login`, `/signup` | `rgb(11, 12, 11)` — near-black |
| `/dashboard` | `rgb(11, 12, 11)` |
| `/games/new` | `rgb(11, 12, 11)` |
| `/studio`, `/studio/demo-dragons` | `rgb(11, 12, 11)` |
| `/games/[id]/processing` | `rgb(11, 12, 11)` |
| `/sessions/[id]`, `/sessions/[id]/complete` | `rgb(11, 12, 11)` |

Clicking the homepage's primary call to action moves the visitor from a warm
off-white editorial page to a black console with a different accent colour
(court orange `#c2410c` on the homepage, lime `#ccff00` everywhere else), a
different type treatment and a different navigation bar. Nothing about the two
surfaces says they belong to one company.

### 2. The `<body>` foreground on the homepage is wrong

`/` computes `color: rgb(231, 229, 224)` — the dark theme's `ink-100`. The
homepage is only legible because every text node overrides it. Any element that
inherits (a bare `<p>`, a plugin, an error boundary) renders near-white on
near-white. Latent bug; the light surface was layered on top of a dark default
rather than being a first-class shell.

### 3. The dashboard has no `<h1>`

`/dashboard` reports **0** `<h1>` elements. The page opens on a panel whose
largest text is a `<p>`. Broken document outline, and a symptom of the real
problem: the dashboard has no stated purpose, it is a stack of four unrelated
cards.

### 4. Application navigation is one link

The app header contains the wordmark and a single "Dashboard" link. There is no
route to the film library, to Studio or to upload from anywhere except the
dashboard body. The marketing header, by contrast, has four items. Two different
navigation models in one product.

### 5. There is no film library

`/studio` lists games and `/dashboard` lists games — two lists of the same
objects with different actions and different styling, and no canonical
"my film" route. `/games` returns 404 even though `/games/new` and
`/games/[gameId]/processing` exist, so the URL space implies a collection that
does not resolve.

### 6. Studio does not look like a workspace

`/studio/demo-dragons` scrolls to 1771px at 1440×900. The video — the only
object the page is about — occupies the upper left and is bounded by a form
column with a large dead void beside it. The disabled "Publish rep" button
renders olive (lime at 45% opacity on black), which reads as a colour, not as a
disabled state.

### 7. Empty states are dashed boxes

Every empty state is a dashed 1px rectangle with two lines of grey text — the
default "nothing here yet" of a generated admin template.

### 8. Everything else that is fine

No route had horizontal overflow. No console errors or page errors were logged
on any route. Session timing, answer secrecy and the video pipeline all behaved.
The redesign must not regress any of that.

## Intended route map

Three shells. They share one type scale, one spacing scale, one radius set, one
control shape, one accent and one motion vocabulary, and differ **only** in
surface brightness and density.

```
MARKETING SHELL  (light, editorial, generous)
  /                        Homepage
  /login                   Sign in
  /signup                  Create account

APPLICATION SHELL  (light, dense, persistent app nav)
  /dashboard               Your next session, last result, accuracy, recent film
  /games                   Film library  (NEW)
  /games/new               Upload a game
  /games/[gameId]/processing   Upload / analysis status
  /sessions/[id]/complete  Session results

FILM SHELL  (dark, the only dark surfaces in the product)
  /sessions/[sessionId]    Taking reps
  /studio/[gameId]         Authoring: video, timeline, clip window, rep list
  embedded on  /           The interactive proof band and the hero frame
```

`/studio` (the index) **redirects to `/games`.** It listed the same games as the
dashboard with different actions; one film library, entered either to take reps
or to author them, is the correct model. The redirect keeps existing links alive.

### Why the film shell is dark

Not for style. Film review is a dark-room task: a bright chrome around a video
frame raises the surround luminance and flattens the perceived contrast of the
footage, and the whole product is about reading one frozen frame. Dark is
functional here and nowhere else, which is why it is confined to the two routes
where a video is the primary object — and why the homepage embeds that same dark
frame, so a visitor has already seen the film shell before they ever reach it.

### Navigation

```
Marketing header    NextRep · How it works · For players · Sign in · [Try a rep]
Application header  NextRep · Dashboard · Film · [Upload film] · account
Film-room header    NextRep · exit affordance back to the app shell · rep progress
```

The application header is persistent across every app-shell route and stays
mounted while the film shell is active, so a player is never stranded.

### Destination of every action

| Action | Lives on | Goes to |
| --- | --- | --- |
| Try a rep / Try a demo session | `/` | `/games/demo-dragons/processing` |
| Upload film | `/` hero, app header (every app route) | `/games/new` |
| Sign in | `/` | `/login` |
| Start reps / Resume reps | `/dashboard` | `/games/[id]/processing` or `/sessions/[id]` |
| See the breakdown | `/dashboard` | `/sessions/[id]/complete` |
| All film | `/dashboard` | `/games` |
| Take reps | `/games` | `/games/[id]/processing` |
| Author reps / Open studio | `/games` | `/studio/[id]` |
| Check status | `/games` | `/games/[id]/processing` |
| Back to film | `/studio/[id]` | `/games` |
| Take this session | `/studio/[id]` after publishing | `/sessions/[id]` |
| Next rep → See results | `/sessions/[id]` | `/sessions/[id]/complete` |
| Back to dashboard | `/sessions/[id]/complete`, errors, 404 | `/dashboard` |

No action returns the user to a screen in a different visual language than the
one they left.
