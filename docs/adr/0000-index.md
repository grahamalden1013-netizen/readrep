# Architecture decision records

Short records of decisions that would be expensive to reverse, and of the
tradeoffs they accept. Each one names what was chosen, what it was chosen
over, and what would make it wrong.

Vendors appear in several of these. None of them is load-bearing: every one
sits behind an interface ReadRep owns, because the blueprint's position is that
vendors change and data ownership should not.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-monorepo-and-package-boundaries.md) | Monorepo and package boundaries | Accepted |
| [0002](0002-web-architecture.md) | Next.js App Router with a data-access layer | Accepted |
| [0003](0003-postgresql-data-access.md) | PostgreSQL, and the Phase 0 local adapter | Accepted |
| [0004](0004-authentication-and-authorization.md) | Authentication and role-based authorization | Accepted |
| [0005](0005-direct-video-upload.md) | Direct-to-provider video upload and playback | Accepted |
| [0006](0006-durable-orchestration.md) | Durable processing orchestration | Accepted |
| [0007](0007-ai-provider-abstraction.md) | Narrow AI operations behind a provider seam | Accepted |
| [0008](0008-youth-privacy.md) | Privacy and security approach for youth video | Accepted |
| [0009](0009-testing-and-evaluation.md) | Testing and evaluation strategy | Accepted |
| [0010](0010-observability.md) | Observability without exposing private media | Accepted |
