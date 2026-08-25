# Pilot plan

The first version is for **one** competitive AAU or high-school team, one coach
who already values film review, two or three players, and three to five real
games — targeting 5–10 excellent learning moments per player per game.

Small on purpose. The goal is to prove the learning workflow is valuable before
automating every technical step.

## Before any footage

1. **A committed coach.** Someone who already conducts film review, not someone
   who might.
2. **Guardian consent** for every player who will be a target, covering film
   upload, automated analysis, and coach assignment. Consent for
   `trainer_access` only if a trainer is actually involved.
3. **Legal review** of the items in `docs/PRIVACY_AND_SECURITY.md`. Minors,
   schools, and biometric-like identity signals all need counsel.
4. **The coach system captured.** Sixteen questions. Without rules, every
   explanation is labelled general basketball reasoning, which is honest but not
   what a coach is paying for.
5. **The benchmark labelled.** 20–30 moments. Without it there is no way to tell
   whether a change helped.

Opposing players appear in the footage and have not consented to anything. That
is an open question, not a solved one.

## Running it

- Process three to five games, with manual assistance wherever the automation is
  not ready. A partially manual pipeline is acceptable; a fake automated
  experience is not.
- Aim for 5–10 high-quality moments per player per game, not maximum volume.
- **Watch the coach review clips.** Time each one. Note which ones they reject
  and why — `RejectionReason` exists so those become data.
- **Watch players complete sessions.** Do not explain the interface. If it needs
  explaining, that is the finding.
- Interview both immediately afterwards, while it is fresh.

## Evidence required before scaling

| Signal | Why it matters |
| --- | --- |
| The coach approves a meaningful percentage of candidates | Below that, review is a chore rather than leverage |
| The coach says it saves time, or enables teaching they would not otherwise do | The actual value proposition |
| Players willingly complete more than one session | One session can be politeness |
| Players can explain missed cues afterwards | Evidence of learning, not just completion |
| Parents and the organisation accept the privacy model | A blocker that surfaces late is fatal |
| Per-game cost supports a plausible subscription price | Measure it; the current budgets are estimates |

## What would make us stop

- The coach rejects most candidates and cannot say why in a way that generalises.
- Players complete sessions once and do not come back.
- Identity tracking is unreliable enough on real youth footage that human
  confirmation is needed constantly rather than occasionally.
- Per-game cost cannot support a price a family or programme would pay.
- Consent proves impractical to obtain at team scale.

Each of these is a reason to change the product or stop, not a reason to hide
the result.
