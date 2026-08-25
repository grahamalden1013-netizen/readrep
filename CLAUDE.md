@AGENTS.md

# ReadRep — Permanent Engineering and Product Constraints

These constraints are binding for every contributor, human or AI, working in this
repository. They are not style preferences. Read this file before changing code.

Product and architecture source of truth: `docs/READREP_PRODUCT_BLUEPRINT.md`.

---

## 1. What ReadRep is

ReadRep is an AI-powered basketball decision-training system built from a player's
real game film. A coach, parent, or authorized player uploads a complete game.
ReadRep helps identify a selected player, finds moments where that player faced a
meaningful basketball decision, grounds the interpretation in the coach's actual
system, and converts approved moments into interactive repetitions:

**pause → decide → reveal → learn → reflect**

The central learning principle: **the player must commit to a decision before
seeing the outcome.** The system teaches the visual cue to recognize next time.

## 2. What ReadRep is not

Do not build toward any of these, however impressive they sound:

- A generic basketball chatbot.
- A highlight generator.
- A box-score product.
- A public ranking system for minors.
- An autonomous AI coach that overrides the human coach.
- A fake analytics dashboard filled with invented metrics.
- A giant team-management platform.

## 3. Non-negotiable product rules

1. **Decision quality and outcome are separate.** A good decision can produce a
   miss; a poor decision can produce a basket. Never collapse them into one
   "correct / incorrect" bit. Never label a player's answer merely "wrong."
2. **The coach's system is the authority.** AI interpretations must cite the
   relevant coach rule. If no coach rule applies, the advice must be explicitly
   labeled general basketball reasoning.
3. **Uncertainty must be visible.** Never pretend to identify a player, action, or
   basketball meaning when the evidence is insufficient. Ask for confirmation.
4. **Human review before authority.** Only coach-approved content may become a
   player-facing learning moment. AI proposals are proposals.
5. **Never reason about off-screen events as if they were visible.** Label them
   unknown.
6. **Never label manually authored data as AI-generated**, and never label
   AI-generated data as coach-approved. `provenance` is a required field, not an
   optional one.
7. **Private by default.** Teams, games, clips, and profiles are private unless a
   consent record and an access grant say otherwise.
8. **No fake success states.** Never show a completed step that did not happen, and
   never claim an external service is connected when it is not.

## 4. Security and privacy constraints

ReadRep processes video and performance information involving **minors**.

- **Never** commit `.env` files, secrets, access tokens, private basketball
  footage, player crops, derived frames, embeddings, or production data. See
  `.gitignore` and `docs/PRIVACY_AND_SECURITY.md`.
- **Never** log secrets, raw private media, or personally identifying media
  content. Use `@readrep/observability`, which redacts by default.
- **Never** expose raw provider URLs to clients. Playback is time-limited and
  authorized server-side.
- **Authorization is enforced in the server data-access layer, never by hiding UI
  buttons.** Every read and every mutation re-checks the caller against the
  resource. See §6.
- **Never** disable a security control to make development easier.
- **Do not claim legal compliance.** Items needing formal legal review are marked
  in `docs/PRIVACY_AND_SECURITY.md`. Minors, schools, biometric-like identity
  signals, and educational records all require counsel before commercial use.

## 5. Repository boundaries

Work only in this repository. Never modify Sidekick, Civic Daily, Rewind, the
homework agent, or any unrelated project.

```
apps/web                  authenticated product, public site, learning + review UI
packages/domain           schemas, permissions, decision taxonomy, state machines
packages/ai               narrow AI operation contracts, adapters, versioning
packages/evals            benchmark fixtures, scoring, regression runner
packages/observability    privacy-safe logging, cost and latency records
services/video            video-provider boundary and webhook contracts
services/orchestrator     durable stage definitions and idempotency contracts
services/vision           detection / tracking service contracts
infra                     deployment and infrastructure documentation, migrations
docs                      product, architecture, privacy, pilot, operations
```

Video, AI, and GPU code must not leak into interactive web routes. `apps/web`
depends on packages; packages never depend on `apps/web`.

## 6. Data access rules (apps/web)

`apps/web` uses a **Data Access Layer**. This is not optional.

- Every module under `src/server/` starts with `import "server-only"`.
- All authorization happens inside the DAL, in `src/server/auth/authorize.ts`, not
  in components and not in the proxy. `src/proxy.ts` performs an optimistic
  redirect only; it is never the security boundary.
- Server Actions are thin. They validate input with a schema, then delegate to the
  DAL, which re-verifies the caller and the caller's relationship to the resource.
- The DAL returns **DTOs** — only the fields the UI needs. Never return raw
  records to a client component.
- Only the DAL reads `process.env`.
- Every route parameter is user input and must be validated before use.

## 7. Engineering principles

- Inspect before modifying. Build one coherent phase at a time.
- Prefer simple explicit boundaries over premature abstraction.
- Validate all external inputs. Use strict structured outputs.
- Make jobs idempotent and restartable. Persist stage results so a failure does not
  erase completed work.
- Keep original evidence separate from interpretation. Keep AI proposals separate
  from coach-approved truth.
- Record model, prompt, schema, and processing versions on every derived claim.
- Design deletion across originals, derivatives, and analysis artifacts.
- Keep costs measurable from the start.
- Avoid monolithic prompts and monolithic application architecture.
- Use real tests, not optimistic descriptions. Never suppress a failing test to
  produce a green result.
- Never claim a feature works unless you tested it. Never say "complete",
  "production-ready", "connected", or "working" without evidence.

## 8. Build phases

Phase 0 is the only phase implemented. Later phases have interfaces reserved but
**no implementation** — do not prematurely wire Mux, Modal, tracking, or paid model
calls.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Product foundation and manual learning-loop prototype | implemented |
| 1 | Production-grade Mux upload and secure playback | not started |
| 2 | Target-player identification (Modal/GPU) + human confirmation | not started |
| 3 | Candidate decision discovery (CV + bounded vision reasoning) | not started |
| 4 | Coach-aware interpretation, review, assignments, learning | partially prototyped in Phase 0 |
| 5 | Pilot hardening, cost controls, operations, billing | not started |

## 9. Commands

```bash
pnpm install          # install workspace dependencies
pnpm dev              # run apps/web locally
pnpm seed             # load the manually authored demonstration data
pnpm verify           # format:check + lint + typecheck + test + build
```

Run `pnpm verify` before every commit.

## 10. Authorization to act

Broad autonomy inside this repository is granted for ordinary technical decisions.
Ask a human before: creating paid resources, publishing publicly, deleting
production data or cloud resources, or making a product choice that would
materially change ReadRep.
