# 0001 — Monorepo and package boundaries

**Status:** Accepted · Phase 0

## Context

The blueprint (Appendix B) is explicit that AI and video code must not leak into
interactive web routes. That is a real risk: a helper imported into a page for
convenience drags a GPU client or a model SDK into the request path, and by the
time anyone notices, the boundary is gone.

The repository already contained a single-package Next.js app with data access
in `lib/` and no boundary at all.

## Decision

One repository, pnpm workspaces, with the package layout from Appendix B.
Dependencies point one way: `apps/web` depends on packages; packages never
depend on `apps/web`, and never on React or Next. Both rules are ESLint errors
(`readrep/packages-must-not-import-app`), not conventions.

Workspace packages export TypeScript source directly and Next transpiles them
(`transpilePackages`). There is no intermediate build step in Phase 0.

## Alternatives considered

**Separate repositories per service.** Better isolation, but the domain schemas
are shared by every one of them, and versioning that across repositories at this
stage would cost more than the boundary is worth. Revisit when a service needs
its own deployment cadence.

**npm or yarn workspaces.** Both work. pnpm was chosen because its strict
`node_modules` layout makes a phantom dependency a build error rather than
something that works locally and fails in CI — which is exactly the failure mode
that erodes package boundaries.

**Building packages to `dist/`.** Correct for publishing, unnecessary here.
A build step means stale artifacts, a watch mode, and a class of "works after
rebuild" bugs, in exchange for nothing a private workspace needs.

## Consequences

- A new package needs a `package.json`, a `tsconfig.json`, and an entry in
  `transpilePackages`. That friction is deliberate.
- pnpm must be used. `npm install` produces a different layout and the strictness
  is lost.
- Because packages ship source, a type error anywhere fails the web build. This
  is a feature.

## What would make this wrong

If a service needs to deploy independently on its own schedule, or a package
needs publishing outside this repository, the no-build-step decision goes first,
then possibly the single repository.
