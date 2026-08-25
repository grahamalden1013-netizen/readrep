# 0009 — Testing and evaluation strategy

**Status:** Accepted · Phase 0

## Context

Two different questions need answering, and conflating them is a common way for
an AI product to look healthy while getting worse:

- Does the software behave correctly? (deterministic, answerable by tests)
- Is the basketball analysis any good? (empirical, answerable only against
  labelled film and a coach's judgement)

## Decision

**Software correctness** is `pnpm verify`: format, lint, typecheck, unit tests,
production build. Tests concentrate where a mistake is expensive rather than
chasing coverage:

- The state machine is tested exhaustively — every transition the table does not
  list is asserted to be rejected, over 100 of them.
- The permission policy is tested against cross-account access for every action.
- Product rules are tested at the schema level, so they hold for any caller.
- The pre-reveal DTO has a **type-level** test: adding a field that could carry
  the answer fails `tsc`. This was verified by trying it.

**Basketball quality** is `@readrep/evals`, and it is deliberately not one
number. Category accuracy, preferred-read accuracy, grounding faithfulness,
uncertainty recall, outcome accuracy, teachability agreement, and
**outcome independence** are reported separately. Outcome independence catches
the specific failure of a good read downgraded because the shot missed; a
contaminated fixture is a blocking regression, not a number to average.

Coverage requirements are enforced on the benchmark set itself: a set of 25
comfortable moments fails, because it lacks the good-decision/bad-outcome,
bad-decision/good-outcome, off-screen, not-teachable, and ungrounded cases.

**Browser verification** covers the two flows end to end, including that the
answer is absent from HTML, RSC payload, and every network response before the
player commits. It is a separate command, not part of `pnpm verify`, because it
needs a running server and a gate that silently skips is worse than no gate.

## Alternatives considered

**A coverage threshold.** Easy to satisfy and easy to satisfy badly.

**Fabricating benchmark fixtures to make the runner demonstrable.** Rejected
outright. A fabricated benchmark measures nothing and would give false
confidence at exactly the moment real confidence is needed. The runner reports
zero fixtures and says why.

**Playwright in `pnpm verify`.** Would make the default gate depend on a build
and a port, and CI failures would be about infrastructure rather than code.

## Consequences

- The benchmark is empty. Labelling 20–30 real moments needs authorized footage
  and a pilot coach, neither of which this repository has.
- The browser smoke test must be run deliberately, and it is easy to forget.
  Documented in the README.
