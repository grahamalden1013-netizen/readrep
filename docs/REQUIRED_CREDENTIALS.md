# External credentials

**Phase 0 needs none of these.** ReadRep runs, persists, and passes its tests
with no cloud account. This list exists so the cost and the decisions ahead are
explicit rather than discovered later.

Names and descriptions only. Never commit a value; `.env.example` holds names.

---

## Phase 0 — local only

| Variable | Purpose |
| --- | --- |
| `READREP_SESSION_SECRET` | Signs the local session cookie. 32+ chars, `openssl rand -hex 32`. A fixed development value is used when unset, and refused in production |
| `READREP_DATA_DIR` | Where the local adapter writes JSON. Defaults to `apps/web/.data` |
| `READREP_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |

---

## Phase 1 — upload, playback, storage, database

### Video provider (Mux or equivalent)

| Variable | Purpose |
| --- | --- |
| `VIDEO_PROVIDER_TOKEN_ID` / `_SECRET` | API access for creating uploads and deleting assets |
| `VIDEO_PROVIDER_WEBHOOK_SECRET` | Verifying webhook signatures. **Required before trusting any webhook** |
| `VIDEO_PROVIDER_SIGNING_KEY_ID` / `_PRIVATE` | Signing expiring playback tokens |

Decisions this forces: retention policy at the provider, whether MP4 downloads
are enabled (they should not be), and geography of storage.

**Cost:** encoding, storage, and delivery are billed separately. A full youth
game is typically 1.5–2.5 hours. Model per-game cost before uploading a season.

### Object storage (frames, crops, embeddings, overlays)

`OBJECT_STORAGE_BUCKET`, `_REGION`, `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`.

Must be private with no public access policy, and lifecycle rules aligned to the
retention policy. This bucket holds cropped images of minors.

### Database

`DATABASE_URL` — managed PostgreSQL. Needs encryption at rest, automated
backups, and a documented backup retention window (deletion propagation to
backups is currently unanswered).

### Identity provider

Replaces the Phase 0 local auth. Requirements: server-side sessions with
revocation, rate limiting, password recovery, and guardian-appropriate flows
for accounts belonging to minors.

---

## Phase 2 — GPU compute

`GPU_PROVIDER_TOKEN_ID`, `_SECRET` (Modal or equivalent).

**Cost:** the largest per-game line item. Detection and tracking over a full
game at even a low sample rate is substantial. Set a hard budget before the
first run; `GAME_BUDGET_MICRO_USD` exists for this.

**Legal:** appearance embeddings for identity may be biometric data. Review
before processing a single real game.

---

## Phase 3/4 — model providers

`ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`.

No paid model call exists in this repository today. Before the first one:

1. Label the benchmark. Without it there is no way to tell whether a prompt
   change helped.
2. Set per-operation cost ceilings. `maxCostMicroUsd` is defined per operation
   and enforced by the runner.
3. Decide the data-retention terms with the provider. Footage frames of minors
   would be sent to a third party, which is a consent question as much as a
   contractual one.

---

## Phase 5 — billing

`BILLING_PROVIDER_SECRET_KEY`, `_WEBHOOK_SECRET`.

---

## Handling

- Never commit a value. `.env*` is gitignored except `.env.example`.
- Only `apps/web/src/server/config.ts` reads `process.env`, enforced by ESLint.
- Secrets stay server-side. `NEXT_PUBLIC_` prefixed variables reach the browser;
  no ReadRep secret may ever carry that prefix.
- Rotate the session secret and provider keys on any suspected exposure, and
  again when anyone with access leaves the project.
