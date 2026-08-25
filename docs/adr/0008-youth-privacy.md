# 0008 — Privacy and security approach for youth video

**Status:** Accepted · Phase 0

## Context

ReadRep processes video and performance information about minors. The blueprint
calls this non-negotiable and a product requirement, not paperwork to add later.
The realistic threats are not exotic: a coach from another club opening a link,
a trainer keeping access after a season ends, a parent withdrawing consent and
finding the film still playable, an operator reading a player's name out of a
log line.

## Decision

Five controls, each placed where it cannot be skipped rather than where it is
convenient.

1. **Private by default, with no public option to set.** There is no `public`
   value in `TeamPrivacyDefaults` and no public-ranking or public-clip feature.
   That is a design constraint, not a backlog item.

2. **Authorization in the data-access layer.** Never in components, never in the
   proxy. See ADR 0004.

3. **Consent gates the action, not the interface.** `film.watch`,
   `film.export`, `game.upload`, and `assignment.create` each require a granted
   consent scope. `not_requested` and `withdrawn` are both denials.

4. **Redaction by default in logs.** `@readrep/observability` runs two
   independent passes: key-based (a field named `email` is redacted whatever it
   holds) and value-based (a string that looks like a URL, JWT, provider key,
   email, or media path is redacted whatever it is called). Nested structures
   are refused rather than walked. Stacks are never logged.

5. **Deletion designed across originals, derivatives, and analysis.** A
   13-target checklist, not a boolean. See ADR 0006.

Supporting: audit events for viewing, sharing, coaching changes, consent, and
administration, including every authorization denial; `.gitignore` rules that
exclude footage, frames, crops, embeddings, and model artifacts; and DTOs that
carry only what a screen needs.

## Alternatives considered

**Adding privacy controls after the learning loop works.** The usual order, and
it means the first pilot runs on real minors' film without them.

**Allow-list logging instead of deny-list redaction.** Stricter in principle.
Rejected because it makes diagnostics so awkward that people log around it,
which is worse. The value-based pass exists to cover what the key-based pass
misses.

**Encrypting player names at rest in Phase 0.** Real protection against a
database compromise, but the Phase 0 store is a local JSON file with no
production data in it, so it would be ceremony rather than security. Revisit at
Phase 1 with the real database.

## Consequences

- Some diagnostics are harder. A support question about "which clip did this
  parent watch" is answered from audit rows and ids, not from log text.
- Consent changes take effect on the next authorization call, which is every
  read — so a withdrawal is immediate rather than eventually consistent.

## Not claimed

**This is not a compliance claim.** No assessment against COPPA, FERPA, GDPR,
state biometric statutes, or school-district policy has been done. Items needing
counsel are listed in `docs/PRIVACY_AND_SECURITY.md`.
