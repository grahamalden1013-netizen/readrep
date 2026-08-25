# 0002 — Next.js App Router with a data-access layer

**Status:** Accepted · Phase 0

## Context

ReadRep's web tier serves three audiences with different rights over the same
resources: a player who may see only their own material, a coach who reviews a
whole roster, and a guardian who acts for one child. Getting that wrong is not a
bug, it is an incident involving minors.

React Server Components change where data is fetched, which changes where
authorization has to live. Next's own guidance is direct about it: a page-level
check does not extend to the Server Actions defined in that page, and a Server
Action is reachable by direct POST whether or not the interface links to it.

## Decision

Next.js 16 App Router, with a **data-access layer** as the only path to data.

- Every module under `apps/web/src/server/` begins with `import "server-only"`.
- All authorization happens in `src/server/auth/authorize.ts`, via
  `requirePermission`, which loads the resource, resolves the caller, and calls
  the pure `authorize()` policy from `@readrep/domain`.
- Server Actions are thin: validate input against a schema, then delegate. They
  never assume a page already checked anything.
- The DAL returns DTOs shaped for one screen, never raw records.
- Only `src/server/config.ts` reads `process.env`, enforced by ESLint.
- `src/proxy.ts` performs an optimistic redirect and is explicitly not a
  security boundary.

## Alternatives considered

**Authorize in the proxy.** Tempting and wrong. Next's docs say plainly that
proxy is not a session-management or authorization solution, and it cannot see
which resource a request will touch.

**Component-level data access.** Fine for prototypes. It makes it easy to pass a
whole record into a client component, which is how a player's full name reaches
another player's browser.

**A separate API service with its own auth.** A reasonable Phase 5 answer for a
larger organisation. Today it would add a network hop and a second authorization
implementation to keep in sync, for no benefit at pilot scale.

## Consequences

- Two hops for every read: page → DAL → repository. Accepted.
- `requirePermission` needs the resource loaded before it can decide, so reads
  fetch first and authorize second. The fetch is not returned unless the check
  passes.
- Denials are audited and then converted to `notFound()` by
  `server/dal/guard.ts`, so an unauthorized caller cannot distinguish a
  forbidden resource from one that does not exist.

## What would make this wrong

A second client (a native app) would need an API surface, and the DAL would move
behind it rather than being duplicated.
