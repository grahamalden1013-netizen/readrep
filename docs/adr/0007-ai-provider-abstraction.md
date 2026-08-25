# 0007 — Narrow AI operations behind a provider seam

**Status:** Accepted · contracts only, no paid calls

## Context

The blueprint is emphatic: avoid one mega-prompt. Build narrow operations with
strict inputs, outputs, timeouts, model tiers, logging, fallbacks, and
evaluation fixtures.

That is not a style preference. A single general prompt cannot be evaluated,
cannot be costed per stage, cannot be partially replaced, and cannot be
prevented from inventing a coach rule.

## Decision

Eight operations, a closed set (`AiOperationName`), each with its own strict
input schema, output schema, timeout, cost ceiling, model tier, prompt version,
and schema version. Adding a ninth is a deliberate architectural change.

The `runOperation` runner enforces an order that is the whole point of having a
runner:

1. Validate input — a malformed input never reaches a provider, so it costs
   nothing.
2. Serve an identical input from cache — a re-run must not be charged twice.
3. Dispatch under a hard deadline.
4. Validate output. Non-conforming output is **rejected**, recorded as
   `schema_rejected`, and never coerced or partially adopted.
5. Record model, prompt, and schema versions, latency, and cost on every path,
   including failures.

Operations are constrained by their schemas as well as their prompts.
`coach_rule_match` can only choose among rules handed to it. `decision_analysis`
grades options and records the outcome as independent fields and has no field
for authoring a rule. Every grounded output must carry confidence and
enumerated uncertainty, and observations must state whether they were `visible`.

Model tiers are named by purpose (`fast`, `balanced`, `deep`), not by vendor.

## Alternatives considered

**A single "analyse this clip" prompt.** Fewer moving parts, and it fails every
requirement above at once.

**Committing to one vendor's SDK in product code.** Faster to write. It also
makes "swap the model" a rewrite, and the blueprint's position is that vendors
change while data ownership does not.

**Letting the model return free text and parsing it.** The failure mode is
silent: a plausible paragraph that cites a rule the coach never wrote.

## Consequences

- Phase 0 makes **no paid model calls**. The default provider is
  `notConfiguredProvider`, which fails loudly rather than returning invented
  analysis — a plausible stub would be indistinguishable from real output.
- Prompts do not exist yet. Writing them is Phase 3/4 work and must be
  accompanied by fixtures.
- Every operation's cost ceiling is currently a design estimate, not a
  measurement.

## What would make this wrong

If two operations always run together on the same evidence and never
independently, they should merge. Splitting for its own sake is its own cost.
