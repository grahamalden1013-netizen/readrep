# Labelling the ReadRep benchmark

The benchmark is the only thing that will tell you whether a model change made
ReadRep better or worse. It is 20–30 manually labelled decision moments from
real film, and **no part of it may be machine-generated**. A fabricated
benchmark measures nothing and gives false confidence at exactly the moment real
confidence is needed.

The repository ships the schema, the coverage requirements, the scoring, and a
runner. It ships **zero fixtures**, because labelling needs authorized footage
and a coach, and this repository has neither. `pnpm test` reports that honestly.

---

## Before you start

You need:

- **Authorized footage.** Consent covering the players who appear. Never
  label from film you do not have permission to use.
- **A coach from the pilot team.** The preferred read is *their* answer, not a
  neutral basketball opinion. Where their system has no rule, that is a finding,
  not a gap to fill in.
- **A second labeller for agreement.** Not required for every fixture, but a
  fixture with `secondLabellerAgreed: false` carries less weight in a dispute.

Fixtures live in `packages/evals/fixtures/` as one JSON file each. **Footage
never enters this repository** — a fixture references a game by an opaque
`gameRef`, never a path or a URL.

---

## Labelling one moment

### 1. Pick the window

Choose the evidence window a reviewer would need to judge the read: enough
before the decision to see it develop, enough after to see what happened.
Ten to fifteen seconds is usually right.

Set `pausePointMs` to the instant **before the answer becomes obvious**. This is
the hardest judgement in the whole process and the one that matters most: pause
too late and the fixture teaches nothing; pause too early and there is no
decision yet.

### 2. Record what you could actually see

`visibility` is required and must be honest:

| Value | Use when |
| --- | --- |
| `full_court_visible` | Everything relevant is in frame for the whole window |
| `weak_side_off_screen` | The weak side leaves the frame |
| `ball_handler_occluded` | The ball handler is blocked at the pause point |
| `target_player_occluded` | The target player is blocked |
| `camera_cut_during_window` | The camera cuts or pans hard |
| `jersey_not_legible` | Numbers cannot be read |
| `ball_not_visible` | The ball leaves the frame |

Anything other than `full_court_visible` means the system must declare
uncertainty, and the schema enforces it: a fixture with something off screen and
an empty `expectedUncertainty` is rejected.

**This is the point of the whole exercise.** Fixtures where something is not
visible are how you find out whether ReadRep says "I cannot see that" or invents
an answer.

### 3. Grade every option

List two to six options a player would plausibly consider. Grade each on the
five-point scale — `preferred`, `acceptable`, `suboptimal`, `high_risk`,
`unclear`. There is no "correct" and no "wrong".

`preferredRead` must be one of the options and must be graded `preferred`.

### 4. Record the outcome separately

`outcome` is what actually happened. **Grade the read first, then record the
result.** If you find yourself adjusting a grade after remembering the shot went
in, stop and re-grade from the pause point.

### 5. Ground it, or say you cannot

`expectedCoachRuleKeys` lists the coach's rules that apply. If none does, leave
it empty **and** add `no_applicable_coach_rule` to `expectedUncertainty` — the
schema requires this pairing, because it is how the benchmark checks that
ReadRep labels ungrounded advice as general basketball reasoning.

### 6. Judge teachability

`teachable: false` for a moment a coach would not spend a player's time on. The
set needs these: without them you cannot measure false positives, and a system
that proposes forty mediocre moments per game will score well on everything
else.

---

## What the set as a whole must contain

Enforced by `assessCoverage`. A set that misses any of these fails, and the
report names what is short.

| Requirement | Minimum | Why |
| --- | --- | --- |
| Fixtures | 20 (max 30) | Blueprint §12. Above 30 the set stops being reviewable |
| Good decision, bad outcome | 3 | The case the product exists to teach |
| Bad decision, good outcome | 3 | The case that teaches a coach to trust it |
| Off screen or occluded | 3 | Tests whether the system admits what it cannot see |
| Not teachable | 2 | Measures false positives honestly |
| No applicable coach rule | 2 | Tests the general-reasoning label |
| Distinct categories | 4 | Stops the set collapsing onto pick-and-roll |

A set of 25 comfortable, fully visible, coach-approved moments will report high
scores and tell you nothing. The runner refuses to call it satisfied.

---

## How it is scored

Seven numbers, reported separately and never blended:

| Metric | Question |
| --- | --- |
| Category accuracy | Did it identify what kind of decision this was? |
| Preferred-read accuracy | Did it pick the coach's read? |
| Grounding faithfulness | Did it cite only rules the coach actually has? |
| Uncertainty recall | Did it declare what it could not see? |
| Outcome accuracy | Did it read the result correctly? |
| Teachability agreement | Does the coach agree it was worth showing? |
| **Outcome independence** | Did the result contaminate the grade? |

Outcome independence catches the one failure that matters most: a good read
downgraded because the shot missed, or a poor read upgraded because it went in.
A contaminated fixture is reported by id and is a **blocking regression**, not a
number to average away.

---

## Running it

```bash
pnpm test                                 # includes the eval unit tests
node -e "..."                             # loadFixtures + evaluate + formatReport
```

With no fixtures the report says so and shows no scores. That is the correct
output today.

## Adding a fixture

1. Write `packages/evals/fixtures/bm-<slug>.json` against `BenchmarkFixture`.
2. Run the loader. A malformed fixture is **reported, not skipped** — silently
   dropping bad fixtures is how a benchmark shrinks without anyone noticing.
3. Re-run coverage and see which requirements are still short.
