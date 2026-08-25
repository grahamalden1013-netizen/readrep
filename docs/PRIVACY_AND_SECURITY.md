# Privacy and security — Phase 0

ReadRep processes video and performance information about **minors**. This
document records the access model, the consent rules, the Phase 0 threat model,
the retention and deletion policy draft, the audit taxonomy, and the test plan
that keeps them honest.

It also records, plainly, what has **not** been done.

> **This is not a compliance claim.** No assessment against COPPA, FERPA, GDPR,
> state biometric statutes, or school-district policy has been performed. See
> [Needs legal review](#needs-legal-review).

---

## 1. Access model

Roles are always scoped to a team through a `Membership`. Nobody holds a role
globally: "coach" means "coach of team X". Implemented in
`packages/domain/src/permissions/policy.ts`.

| Role | Can | Cannot |
| --- | --- | --- |
| **Coach** | View the roster, upload and delete games, watch film, edit the coach system, review candidates, publish moments, assign sessions, view attempts | Manage team members, read the audit log, submit attempts, manage consent |
| **Player** | View their own assignments and moments, watch their own film, submit attempts and reflections | See a teammate's material, review candidates, publish, assign |
| **Guardian** | Act for players they are *verified* against: view, upload film, watch film, manage consent, see attempts | Act for any other player, review candidates, publish, assign, edit the coach system |
| **Program admin** | Everything a coach can, plus manage members and read the audit log | Submit attempts or reflections as a player |
| **Trainer** | Only what an explicit, unexpired, unrevoked `AccessGrant` allows, and only if the team permits trainer grants at all | Anything without a grant; review, publish, or assign under any circumstances |

Three properties of the policy worth stating because they are easy to get wrong:

- **A resource cannot be authorized without its owning team.** The type system
  requires it, so cross-account access is a compile error rather than a
  code-review question.
- **Multiple roles are evaluated independently, end to end.** A capability from
  one membership can never be combined with an ownership tie from another.
- **An unverified guardian claim grants nothing.** `verifiedAt` is what makes
  the relationship load-bearing.

### Where authorization is enforced

In the server data-access layer, via `requirePermission` in
`apps/web/src/server/auth/authorize.ts`. Every read and every mutation.

**Not** in components, and **not** in `src/proxy.ts`. The proxy performs an
optimistic redirect for visitors with no session cookie and is explicitly not a
security boundary — it does not verify the signature and does not know which
resource a request will touch.

Denials are audited and then rendered as `notFound()`, so a caller who is not
entitled to a resource cannot distinguish it from one that does not exist.

---

## 2. Consent

Six states. **Only `granted` permits an action.** `not_requested` is treated
exactly like `denied` — absence of a consent record is never permission.

| Scope | Gates |
| --- | --- |
| `film_upload` | Storing film, watching film, exporting film |
| `automated_analysis` | Running automated analysis over a player's film |
| `coach_assignment` | A coach assigning learning moments to that player |
| `trainer_access` | Granting a named trainer access |
| `extended_retention` | Retaining film beyond the team's default window |

Rules encoded in the schema:

- Granted consent must record **who** granted it and **when**.
- Withdrawn consent must record **when** it was withdrawn.
- Withdrawal takes effect on the next authorization call, which is every read.
  There is no cache to invalidate and no eventual consistency window.

Guardians manage consent for their own player. Coaches can see consent state but
cannot change it.

**Not built in Phase 0:** the consent *request* flow (sending a guardian a
request and recording their response), consent expiry sweeps, and any
verification of a guardian's identity beyond an administrator marking the
relationship verified.

---

## 3. Phase 0 threat model

Scope: the code in this repository as it stands, running locally with the local
adapter. Real deployment threats (a production database, a video provider, a CDN)
arrive with Phase 1 and are out of scope here.

### Assets

1. Game film of minors (does not exist yet in Phase 0).
2. Derived media: frames, player crops, embeddings, overlays.
3. Player identity: names, jersey numbers, team membership.
4. Performance information: attempts, decision quality, reflections.
5. Coach intellectual property: the team's system and rules.
6. Credentials: session secret, and later provider keys.

### Actors

| Actor | Motivation |
| --- | --- |
| Curious teammate | See how another player is doing |
| Coach of a rival team | See another team's system or personnel |
| Former trainer | Retain access after a season ends |
| Parent of another player | See another family's child |
| Opportunistic external attacker | Scrape youth video, credential stuffing |
| Well-meaning developer | Log something useful; commit a test fixture |

### Threats and current state

| # | Threat | Mitigation | State |
| --- | --- | --- | --- |
| T1 | A player opens another player's session by editing the URL | DAL authorizes the assignment against the caller's own player; route params validated | **Mitigated**, tested in unit and browser tests |
| T2 | A coach reads another team's material | Every resource carries its owning team; no membership → denied | **Mitigated**, tested (every action, browser-verified) |
| T3 | A trainer keeps access after a season | Access grants are explicit, revocable, and expirable; checked per request | **Mitigated**, tested |
| T4 | A player peeks at the answer before committing | Pre-reveal DTO carries no answer; explanation is returned only by the action that stores the attempt | **Mitigated**, type-level test plus browser assertion over HTML, RSC payload, and network |
| T5 | Guardian withdraws consent, film stays watchable | Consent re-checked on every authorization call | **Mitigated**, tested |
| T6 | Private media content reaches a log | Redaction by default, two passes, non-scalars refused | **Mitigated**, 39 tests |
| T7 | Footage or crops committed to git | `.gitignore` excludes media, frames, crops, embeddings, model artifacts | **Mitigated**, ignore rules verified |
| T8 | Secrets committed | `.env*` ignored except `.env.example`, which holds names only | **Mitigated** |
| T9 | Session cookie forged or replayed | HMAC-SHA256, constant-time compare, expiry enforced | **Partially mitigated** — no server-side revocation |
| T10 | Credential stuffing against sign-in | Generic error message prevents account enumeration | **Partially mitigated** — no rate limiting or lockout |
| T11 | Server Action called directly by POST | Actions validate input and delegate to the DAL, which re-authorizes | **Mitigated** by design; not yet tested by direct POST |
| T12 | Provider URL leaks a private clip | No playable URL is stored; playback is per-request and expiring | **Interface only** — no provider exists yet |
| T13 | Webhook forged or replayed | Signature verification before parsing; idempotency key into the run dedupe log | **Interface only** — not implemented |
| T14 | Stolen backup exposes player data | — | **Not mitigated.** No encryption at rest, no backup policy. Phase 1 |
| T15 | Malicious upload (malware, decompression bomb) | Format and duration validation specified in the `securing` stage | **Not implemented** |
| T16 | An operator with database access reads everything | — | **Not mitigated.** No field-level encryption, no access separation. Phase 5 |

---

## 4. Retention and deletion — policy draft

**Draft. Needs legal review before any real footage is uploaded.**

| Class | Default | Configurable |
| --- | --- | --- |
| Original game upload | 365 days | Per team, 1–3650 days |
| Derived frames and crops | Deleted with the original | No |
| Embeddings | Deleted with the original | No |
| Decision candidates and analysis | Deleted with the game | No |
| Learning moments and attempts | Retained while the player is rostered | Phase 5 |
| Audit events | Retained; append-only | No |

### Deletion propagation

Deletion is a checklist of 13 targets, not a boolean. A run is not `deleted`
until every one is confirmed purged:

`provider_original`, `provider_renditions`, `thumbnails`, `frames`,
`player_crops`, `embeddings`, `overlays`, `tracks`, `possessions`,
`decision_candidates`, `ai_operation_results`, `learning_moments`,
`player_attempts`.

Targets that fail to purge are recorded with a reason and surfaced, never
silently dropped.

**Backups are not covered.** Phase 1 must state a backup retention window and
whether deletion propagates to it. Today the honest answer is that it does not,
because there are no backups.

---

## 5. Audit taxonomy

Every event records actor, action, resource type and id, outcome
(`allowed` / `denied` / `error`), coarse security context (IP, user agent,
request id), and scalar-only metadata. Never media content, never names, never
free text a player wrote.

| Group | Actions |
| --- | --- |
| Authentication | `auth.signed_in`, `auth.signed_out`, `auth.sign_in_failed`, `auth.session_revoked` |
| Private media access | `film.viewed`, `film.playback_granted`, `film.download_requested`, `moment.viewed`, `attempt.viewed` |
| Sharing | `access.granted`, `access.revoked`, `share.link_created`, `share.link_revoked` |
| Coaching changes | `coach_system.created`, `coach_system.activated`, `coach_rule.edited`, `candidate.reviewed`, `moment.published`, `moment.retired`, `assignment.created`, `assignment.revoked` |
| Consent | `consent.requested`, `consent.granted`, `consent.denied`, `consent.withdrawn` |
| Administration | `team.member_added`, `team.member_removed`, `team.role_changed`, `game.uploaded`, `game.deleted`, `video.deleted`, `retention.purged` |
| Security | `authz.denied` |

**Reads of private media are audited, not just writes.** Knowing who watched a
minor's film is the point.

---

## 6. Cross-account authorization test plan

### Automated today

| Test | Where |
| --- | --- |
| Every action refused to a coach of another team, on team and player resources | `packages/domain/src/permissions/policy.test.ts` |
| Player refused a teammate's moments, attempts, and submissions | same |
| Guardian refused another family's player | same |
| Unverified guardian claim grants nothing | same |
| Trainer with no grant, revoked grant, and expired grant all refused | same |
| Consent missing / withdrawn blocks film and assignment | same |
| Suspended and invited memberships refused | same |
| Multiple roles cannot be combined to escalate | same |
| Outsider refused a session URL and a candidate URL, through real routes | `apps/web/tests/browser-smoke.mjs` |
| Trainer without a grant refused through real routes | same |
| Answer absent from HTML, RSC payload, and network before commit | same |

### Required before the pilot, not yet written

- Direct `POST` to each Server Action with another team's resource id, bypassing
  the interface entirely.
- Playback grant requested for another team's asset (needs Phase 1).
- Export and download routes (do not exist yet).
- Session fixation and cookie replay after sign-out (needs server-side sessions).
- Deletion verification: prove every derivative is unreachable afterwards.

---

## 7. Safe logging rules

1. Use `@readrep/observability`. `console` is an ESLint error outside tests.
2. Log messages are static developer-authored strings. Anything variable goes in
   `fields`, where it is redacted.
3. Log identifiers, not content: `gameId`, `stage`, `attempts`, `inputHash`.
4. Never log a player's name, a guardian's email, a reflection, a note, a
   provider URL, a playback id, a storage key, or a token.
5. Never log an error stack. Stacks carry paths and sometimes request data.
6. Non-scalar fields are refused by the logger rather than serialized.

---

## 8. Rules that are product constraints, not settings

- **No public player rankings.** Not a disabled feature; not built.
- **No public clips.** There is no `public` value in the privacy model.
- **No leaderboards or comparisons between minors.**
- **No single "basketball IQ" score.** Blueprint §14 is explicit that inventing
  one before it has a defensible definition is a mistake. The coach dashboard
  reports the distribution of decision quality with links to clips.
- **A player is never told they were wrong.** Answers are placed on a five-point
  scale and explained.

---

## Needs legal review

Each of these requires counsel before ReadRep touches real footage
commercially. None is resolved.

1. **Minors' data.** Consent mechanics, verifiable parental consent, and the age
   threshold that applies in each jurisdiction.
2. **Schools and districts.** If ReadRep is used through a school, educational
   record obligations may attach to attempts and reflections.
3. **Biometric-like signals.** Appearance embeddings and jersey OCR used for
   identity may fall under biometric statutes in some jurisdictions, regardless
   of intent. This affects Phase 2 directly.
4. **Retention windows.** The 365-day default is an engineering placeholder, not
   a legal position.
5. **Recording consent for opponents.** Opposing players appear in the footage
   and have not consented to anything.
6. **Data subject rights.** Access, correction, deletion, and portability
   request handling.
7. **Cross-border transfer.** Where footage is stored and processed.
8. **Coach system ownership.** Whether a coach's rulebook is theirs, the
   program's, or ReadRep's.
