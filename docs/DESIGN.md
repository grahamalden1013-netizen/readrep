# Design language

ReadRep is used in a gym, on a phone, between drills, by a sixteen-year-old who
does not want a lecture. Everything below follows from that.

## What it should feel like

Premium, athletic, focused, trustworthy, fast. Modern without being childish.
Appropriate for a competitive programme.

## What it must not be

Generic purple AI gradients. Marketing headlines inside the product. Fake
graphs. Invented performance scores. Card soup. Whitespace that hides the main
action. Cluttered timelines. Long AI essays. Motion that slows a session down.
Anything that looks like an app-builder template.

## Decisions

### Dark only

Deliberate, not an unfinished light mode. This is a film-review tool: a single
committed dark surface keeps video the brightest thing on screen and keeps the
decision-quality palette meaning one thing everywhere. A theme toggle would
double the surface area of every colour decision for no benefit to a player
running four reps.

### One accent

A leather orange (`--color-court-500`). Actions and active state, nothing else.
When one colour means "this is the thing to do", the interface needs no arrows.

### Colour is reserved for decision quality

Five steps, never two:

| Token | Meaning |
| --- | --- |
| `--color-quality-preferred` | Preferred read |
| `--color-quality-acceptable` | Acceptable read |
| `--color-quality-suboptimal` | Better read available |
| `--color-quality-risk` | High-risk read |
| `--color-quality-unclear` | Not enough evidence to judge |

There is no red/green right/wrong pair, because there is no right/wrong. Every
use is paired with its written label, so colour is never the only carrier of
meaning and a colour-blind player loses nothing.

### The clip and the decision dominate

The player session is one column. The film panel is first, the question is
second, and nothing else competes until the player has committed. The coach
review is denser because a coach's scarce resource is time, not attention.

### Honest empty states

There is no game film in Phase 0, so the film panel says "authorized clip
required" and shows the timestamps the moment is actually built from. It never
renders a player that cannot play, and never a placeholder image implying
footage exists. An interface that looks like it is working is worse than one
that says what is missing.

### Motion is almost absent

A single 180ms rise on the question and the reveal, and it is disabled under
`prefers-reduced-motion`. Nothing in a session is decorative enough to be worth
a player's time.

### Keyboard is a first-class path

A player runs a session with the number keys and Enter. Focus moves to the
question when a rep opens and to the reveal when it arrives, so a screen-reader
user is told the outcome came rather than having to go looking. One consistent
focus ring, always visible.

## Type and spacing

Geist Sans throughout, Geist Mono for timestamps and identifiers — the two
places a monospace actually helps. Tight tracking on headings, generous line
height on explanations, because those are read carefully and everything else is
scanned.

## What is measured, and what is not

The coach dashboard shows the distribution of decision quality with links to
clips. It does not show a single score. Blueprint §14 is explicit that inventing
a basketball-IQ number before it has a defensible definition is a mistake, and a
number is exactly what a parent would screenshot.
