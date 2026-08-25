# 0003 — PostgreSQL, and the Phase 0 local adapter

**Status:** Accepted · Phase 0

## Context

ReadRep's data is relational and constraint-heavy: memberships, consent scoped
per player, immutable coach-rule revisions, attempts that must not precede their
own commitment. Several of the product's rules are best expressed as database
constraints, where they cannot be forgotten.

Phase 0 also has to run for a new developer with no cloud account and no
credentials, and its tests must not need a database.

## Decision

**PostgreSQL** is the target. The schema is committed now, at
`infra/db/migrations/0001_initial_schema.sql`, even though nothing runs it yet,
because it is where the domain's invariants become constraints and reviewing it
is how they get checked before Phase 1 depends on them.

**Phase 0 runs on a local file-backed adapter** implementing the same repository
ports (`@readrep/domain/ports`). Ports are narrow and name real product
questions; there is no generic `find(query)`, which is what stops a caller
quietly widening a read past what it is authorized for.

Repositories fetch and do not authorize. Keeping the two apart means an
authorization test cannot be fooled by a repository that helpfully filters.

## Alternatives considered

**Prisma or Drizzle now.** Either is a likely Phase 1 answer. Introducing one in
Phase 0 would mean a running database for `pnpm test` and a generated client in
the loop before there is a single query worth optimising.

**SQLite locally, PostgreSQL in production.** Closer to real SQL, but the
dialects differ exactly where this schema is interesting — enums, partial unique
indexes, array columns — so the local behaviour would not predict production.

**Supabase for Phase 0.** A project exists but is paused, and Phase 0 was
deliberately built to need no credentials. Wiring it now would also make the
first vendor decision before the ADR describing it.

## Consequences

- The local adapter is not concurrent, not transactional, and not indexed. It
  serializes writes behind an in-process lock and rewrites a whole collection
  per write. Recorded in `docs/KNOWN_LIMITATIONS.md`.
- It caches collections in memory and does not notice external writes, so
  re-running `pnpm seed` against a running server serves stale data until
  restart.
- Two implementations of the ports must be kept honest. The ports are small
  enough that this is manageable, and Phase 1 deletes the local one for
  everything but tests.

## What would make this wrong

If the pilot needs multi-writer concurrency before Phase 1 lands, the local
adapter is replaced early rather than hardened.
