# Known limitations

What Phase 0 does not do, stated plainly. Nothing here is hidden behind a
placeholder or a fake success state.

## Not implemented at all

| Area | State |
| --- | --- |
| Video upload | Interface only. `notConfiguredVideoProvider` throws on every method |
| Video playback | Interface only. No provider, no signed URLs, no player |
| Transcoding, frames, thumbnails | Not implemented |
| Player detection, tracking, identity | Interface only. `notConfiguredVisionService` throws |
| Candidate discovery | Not implemented |
| AI analysis | Contracts only. `notConfiguredProvider` throws. **No paid model call exists in this repository** |
| Processing workers | The state machine is implemented and tested; nothing executes stages |
| Billing | Not started |
| Email, invitations, notifications | Not implemented |
| Consent request flow | Consent records and gates exist; the flow to *ask* a guardian does not |
| Sign-up | Accounts are created by the seed script only |

## Implemented but provisional

### Authentication (`apps/web/src/server/auth/`)

A local signed-cookie provider. Adequate for local development, **not** a
production identity story.

- **No session revocation.** Signing out clears the cookie in that browser; a
  copied cookie stays valid until it expires (12 hours). There is no
  server-side session store to revoke against.
- **No rate limiting or lockout** on sign-in. The generic error message prevents
  account enumeration, but not brute force.
- **No password recovery**, no email verification, no MFA.
- Passwords are scrypt-hashed with a per-user salt and compared in constant
  time, which is the one part of this that is not provisional.

### Data storage (`apps/web/src/server/store/`)

A file-backed JSON adapter behind the domain's repository ports.

- **Not concurrent.** Writes are serialized behind an in-process lock. Two
  server processes against the same directory will lose writes.
- **Not transactional.** A multi-step operation that fails halfway leaves
  partial state. `saveCoachSystem` orders its writes to fail safe, but this is
  care rather than a guarantee.
- **Rewrites a whole collection per write.** Fine for fixtures, not for volume.
- **Caches in memory and does not notice external writes.** Re-running
  `pnpm seed` while the server is running serves stale data until restart. This
  bit during development and is worth knowing.
- **No indexes.** Every query is a linear scan.

### Authorization

The policy itself is thorough and heavily tested. Two gaps:

- **Server Actions have not been tested by direct POST.** They validate input
  and delegate to the DAL which re-authorizes, so the design is right, but the
  attack has not been performed.
- **No rate limiting** on any mutation.

## Content limitations

- **No game film exists.** Every moment is built from a manually authored
  timestamp. The interface shows an "authorized clip required" panel with the
  timestamps rather than a player or a placeholder image.
- **The benchmark is empty.** The schema, coverage rules, scoring, and runner
  work; there are zero fixtures, because labelling needs authorized footage and
  a coach. See `docs/BENCHMARK_LABELING.md`.
- **The demonstration data is manually authored** and labelled as such
  everywhere it appears. Its provenance is `manual_authoring`, never
  `ai_proposal` and never `coach_approved`.
- **Stage cost budgets are design estimates**, not measurements. Nothing has
  been spent, so nothing has been measured.

## Interface limitations

- **Dark only.** A deliberate choice for a film-review tool (see
  `docs/DESIGN.md`), not an unfinished light mode.
- **Screen-reader testing has not been done.** Semantic markup, labels, focus
  management, `aria-live` announcements, and visible focus rings are in place,
  and colour is never the only carrier of meaning — but no assistive technology
  has actually been used against these screens.
- **No offline support**, no service worker, no installability.
- **The keyboard handler attaches on hydration.** A key pressed in the moment
  between first paint and hydration is lost. The browser test retries, as a
  person would.

## Operational limitations

- **No CI pipeline.** `pnpm verify` runs locally; nothing runs it on push.
- **No deployment.** The app has never been deployed anywhere.
- **No backups**, so nothing to say about deletion propagating to them.
- **No encryption at rest** beyond whatever the filesystem provides.
- **The browser smoke test is not in `pnpm verify`** — it needs a running
  server. It is easy to forget to run.
