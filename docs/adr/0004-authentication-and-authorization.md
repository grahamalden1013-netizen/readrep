# 0004 — Authentication and role-based authorization

**Status:** Accepted · Phase 0 (authentication is provisional)

## Context

Five roles, all scoped to a team: coach, player, guardian, program administrator,
trainer. Nobody holds a role globally — "coach" always means "coach of team X".
On top of the role sit two further gates the blueprint requires: guardian
consent, and explicit access grants for trainers.

## Decision

**Authorization** is a pure function, `authorize()`, in `@readrep/domain`. It
takes the actor's memberships, guardianships, and grants, the action, the
resource, the consent state, and the team's privacy defaults, and returns
allow or a named denial reason. No I/O, no clock, no globals — so it is
exhaustively testable and cannot behave differently in a Server Action than it
does in a page.

Three properties are deliberate:

- **A resource cannot be authorized without its owning team.** The
  `PermissionResource` type makes cross-account access a type error rather than
  a code-review question.
- **Consent denies by default.** `not_requested` is treated exactly like
  `denied`. Absence of a consent record is never permission.
- **Multiple roles are evaluated end to end, each on its own.** A capability
  from one membership can never be combined with an ownership tie from another.

**Authentication** in Phase 0 is a local signed-cookie provider: scrypt password
hashes, an HMAC-SHA256 cookie holding a user id and an expiry, compared in
constant time, `httpOnly` and `sameSite=lax`. It is provisional and is Phase 1's
first replacement.

## Alternatives considered

**PostgreSQL row-level security as the boundary.** Good defence in depth, and
planned for Phase 1 as such. It is a poor primary control here because the
decision depends on consent state and grants, which would push policy into SQL
where it is harder to test and much harder to explain to a coach.

**An identity provider now (Auth.js, Clerk, Supabase Auth).** The right Phase 1
answer. Adopting one in Phase 0 would have made credentials a prerequisite for
running the app at all, which was the thing Phase 0 was meant to avoid.

**Roles as a global attribute on the user.** Simpler and wrong: a parent with
children on two teams, or a coach who also coaches their own child, breaks it
immediately.

## Consequences

- Phase 0 has **no session revocation** beyond expiry, no rate limiting, no
  lockout, and no password recovery. All recorded in
  `docs/KNOWN_LIMITATIONS.md`.
- Every DAL entry point must call `requirePermission`. A new one that forgets is
  a hole, which is why the cross-account tests exercise the policy directly and
  the browser smoke test exercises it through real routes.
- The policy has 34 unit tests, including one that walks every action against an
  outsider and asserts every single one is refused.

## What would make this wrong

Nothing about the authorization design. The authentication half is expected to
be replaced wholesale and should not accumulate features in the meantime.
