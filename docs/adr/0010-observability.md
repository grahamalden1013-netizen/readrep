# 0010 — Observability without exposing private media

**Status:** Accepted · Phase 0

## Context

Long video pipelines are undebuggable without good telemetry, and the material
flowing through them is exactly what must never be logged. The blueprint also
requires per-game economics from the start, because a product that cannot say
what a processed game costs cannot be priced.

## Decision

**One logger, and it redacts.** `@readrep/observability` is the only logger the
server may use; `console` is an ESLint error outside tests. Messages are
developer-authored static strings and are not redacted; everything variable goes
in `fields`, which is. That single rule is what makes the logger trustworthy.

Redaction is described in ADR 0008. Non-scalar fields are refused rather than
serialized, because a call that passes a record is a call that eventually passes
a player's name.

**Cost is an integer.** Micro-USD, so per-game totals do not drift under
floating-point addition. Cost and latency are recorded on the failure paths too
— a timed-out GPU job still costs money, and a system that only records
successes will understate spend exactly when it matters.

**Identifiers, not content.** Diagnostics are answered from `gameId`, `stage`,
`attempts`, and `inputHash`. Enough to find a problem, not enough to reconstruct
what a minor did on a basketball court.

## Alternatives considered

**A hosted APM with automatic instrumentation.** Excellent visibility, and its
default is to capture request bodies, headers, and error strings — which here
would ship signed playback URLs and player names to a third party. If one is
adopted, it goes behind the same redaction.

**Logging freely in development, redacting in production.** The environments
diverge, developers debug against redacted output they have never seen, and the
production path is the one nobody has tested.

**Sampling logs to control cost.** Premature. There is no volume yet, and
sampling would drop the rare failure that matters.

## Consequences

- Phase 0's metrics sink is in memory. Nothing is persisted or shipped anywhere.
  Phase 1 replaces it; the records exist now so the shape is settled before the
  spending starts.
- Redaction can obscure a real diagnostic. The escape hatch is to add a
  non-sensitive structured field, never to log the raw value.
