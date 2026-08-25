# 0006 — Durable processing orchestration

**Status:** Accepted · state machine implemented, worker not

## Context

Processing a game is long, expensive, and fails in the middle. The blueprint
requires that every completed stage is persisted so a failure does not erase
prior work, and that the user sees honest stage names rather than a spinner.

## Decision

**The state machine lives in `@readrep/domain`, not in the orchestrator.** What
"awaiting coach review" means is product meaning, not infrastructure, and it
should not change when the queue does. `services/orchestrator` holds the stage
definitions — timeouts, attempt limits, budgets — and the idempotency contract.

Seventeen states, an exhaustive transition table, and a pure
`applyProcessingEvent` that never reads the clock. Specifics worth naming:

- **Two kinds of idempotency, kept apart.** The run holds a dedupe log of
  applied event keys so a redelivered message is a no-op; a stage holds its own
  key so a worker does not recompute work already done. Conflating them was a
  real bug during development, caught by a test.
- **Retries resume at the failed stage**, and earlier stages keep their
  artifacts. `retryable` is set by the code that raised the failure — a missing
  consent record is not transient and must never be retried into success.
- **Deletion is a checklist, not a boolean.** A run is not `deleted` until all
  13 targets are confirmed purged, spanning originals, derivatives (frames,
  crops, embeddings, overlays), and analysis artifacts.
- **Any state may begin deleting.** A deletion request is never blocked by where
  processing happens to be.

Stage order puts human player confirmation and the cheap discovery pass before
any expensive analysis, so a mis-identified player cannot cost a GPU bill.

## Alternatives considered

**A workflow engine (Temporal, Inngest, Restate) owning the state.** Likely for
Phase 1 execution. Letting it own the *state definition* would put product
meaning inside a vendor's runtime, and make the states hard to test and hard to
render honestly to a user.

**A simple job queue with status columns.** What most projects do, and it grows
implicit states nobody wrote down. The explicit table is the point.

## Consequences

- Nothing executes these stages yet. The pipeline definition is asserted against
  the domain's state order by a test, so the two cannot drift.
- Workers must satisfy `IDEMPOTENCY_CONTRACT`: derive keys from stable inputs,
  check before working, write deterministic artifact keys, and make the result
  write and the transition atomic.

## What would make this wrong

If stages turn out to need fan-out within a stage (per-possession parallelism),
the stage model needs sub-tasks, which the current shape does not express.
