# ReadRep

AI-powered basketball decision training built from a player's real game film.

A coach, parent, or authorized player uploads a full game. ReadRep finds the
moments where the player faced a real decision, grounds the interpretation in
the coach's own system, and turns approved moments into repetitions:

**pause → decide → reveal → learn → reflect**

The player must commit to a read before seeing what happened. The lesson is the
visual cue to recognise next time.

> **Where this build actually is.** Phase 0 of six. The learning loop works end
> to end against manually authored moments. Video upload, playback, player
> tracking, and AI analysis are specified and interfaced but **not implemented** —
> no footage is processed and **no model is called**. See
> [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

---

## Run it

Requires **Node 22+** and **pnpm 10+**.

```bash
pnpm install
pnpm --filter @readrep/web seed     # manually authored demonstration data
pnpm dev                            # http://localhost:3000
```

The seed script prints the sign-in accounts and their password. Start with
`player@readrep.local` to run a session, then `coach@readrep.local` to review
candidates.

No credentials, no database, and no cloud account are needed. Phase 0
deliberately runs on a local file-backed store.

### Commands

```bash
pnpm dev            # run apps/web
pnpm build          # production build
pnpm seed           # load demonstration data
pnpm test           # unit tests (vitest)
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit across every workspace
pnpm format         # prettier --write
pnpm verify         # format:check + lint + typecheck + test + build
```

Run `pnpm verify` before every commit.

The browser smoke test is separate because it needs a running server:

```bash
pnpm build
READREP_SESSION_SECRET=$(openssl rand -hex 32) \
  pnpm --filter @readrep/web start -p 3100
pnpm --filter @readrep/web test:browser
```

---

## Try the things that matter

Once seeded:

| Do this | And you should see |
| --- | --- |
| Sign in as `player@readrep.local`, open a session | The clip panel says *authorized clip required* and shows real timestamps — no film exists and nothing pretends otherwise |
| Open dev tools before answering | No answer anywhere in the HTML, the RSC payload, or any network response |
| Answer, then read the reveal | The read graded on a five-point scale, the cue, every option, the coach's cited rule, and the outcome as a **separate** field |
| Sign in as `coach@readrep.local`, open the review queue | Observed facts and basketball inference in separate columns; which rules the proposal cited and which it missed |
| Open `cand-transition-ungrounded` | Labelled *general basketball reasoning*, because the coach has no rule for it |
| Sign in as `trainer@readrep.local`, open a candidate | Refused — the trainer holds no access grant |
| Sign in as `outsider@readrep.local`, open the player's session URL | Refused, and indistinguishable from a URL that does not exist |

---

## Layout

```
apps/web                  authenticated product, public site, learning + review UI
packages/domain           schemas, permissions, decision taxonomy, state machines
packages/ai               narrow AI operation contracts (no paid calls)
packages/evals            benchmark fixtures, scoring, evaluation runner
packages/observability    privacy-safe logging, cost and latency records
services/video            video-provider boundary and webhook contracts
services/orchestrator     durable stage definitions and idempotency contracts
services/vision           detection / tracking service contracts
infra/db/migrations       PostgreSQL schema (committed, not yet run)
docs                      blueprint, ADRs, privacy, benchmark, roadmap, pilot
```

Dependencies point one way: `apps/web` depends on packages; packages never
depend on `apps/web`, on React, or on Next. ESLint enforces both.

---

## The rules this codebase is built around

These are not style preferences. They are in
[CLAUDE.md](CLAUDE.md), enforced by schemas and tests, and Phase 1 inherits them.

1. **Decision quality and outcome are separate.** A good read can miss; a poor
   one can go in. There is no boolean correctness field anywhere, and a test
   asserts the serialized shape contains none. A player is never told they were
   wrong.
2. **The coach's system is the authority.** Explanations cite the coach's own
   rule. Where no rule applies, the advice is labelled *general basketball
   reasoning* — enforced by the schema, which rejects an ungrounded
   interpretation that does not declare it.
3. **Uncertainty is visible.** Twelve enumerated kinds. Off-screen events are
   labelled unknown, never reasoned about as if seen.
4. **Human review before authority.** Only coach-approved or manually authored
   content reaches a player. AI proposals are proposals.
5. **Provenance is required.** Manually authored data is never labelled
   AI-generated; an AI proposal is never labelled coach-approved.
6. **Private by default.** No public rankings, no public clips — not disabled
   features, not built.
7. **Authorization lives in the data-access layer**, never in a hidden button
   and never in the proxy.
8. **No fake success states.** Unconfigured services throw rather than returning
   plausible stubs.

---

## Documentation

| | |
| --- | --- |
| [Product blueprint](docs/READREP_PRODUCT_BLUEPRINT.md) | Source of truth |
| [Architecture decisions](docs/adr/0000-index.md) | Ten ADRs and their tradeoffs |
| [Privacy and security](docs/PRIVACY_AND_SECURITY.md) | Access model, consent, threat model, retention, audit |
| [Known limitations](docs/KNOWN_LIMITATIONS.md) | What Phase 0 does not do |
| [Roadmap](docs/ROADMAP.md) | Phases 1–5 and the boundaries each implements |
| [Required credentials](docs/REQUIRED_CREDENTIALS.md) | What later phases will need |
| [Benchmark labelling](docs/BENCHMARK_LABELING.md) | How to build the evaluation set |
| [Design language](docs/DESIGN.md) | Why it looks the way it does |
| [Pilot plan](docs/PILOT.md) | The first team, and what would make us stop |

---

## Environment

Copy [.env.example](.env.example) to `apps/web/.env.local`. It contains names and
descriptions only — never a value. Phase 0 needs nothing set; the app runs on a
clearly-marked development secret and refuses it in production.

`.env*` is gitignored, along with video, frames, player crops, embeddings, and
model artifacts. ReadRep handles footage of minors and none of it belongs in
version control.
