# Roadmap

Phase 0 is implemented. Later phases have interfaces reserved and no
implementation — no Mux, no Modal, no tracking, no paid model call.

The build order is the blueprint's, and it is deliberate: **prove the learning
experience manually, then automate ingestion, player identity, candidate
discovery, and coach-aware reasoning, in that order.** Starting with autonomous
analysis is the failure mode this ordering exists to prevent.

---

## Phase 0 — Product foundation and manual learning loop · **implemented**

Canonical schemas, permissions, decision taxonomy, processing state machine,
the exact player session, coach questionnaire and review, benchmark
foundation, privacy foundation, quality gates.

**Exit criteria (all met):** a developer can run ReadRep locally, load a
manually prepared learning moment from structured data, complete
pause → decide → reveal → learn → reflect, and see how later stages connect.

---

## Phase 1 — Production-grade upload and secure playback · **not started**

The first phase that touches real footage, so it is also the first that carries
real privacy risk.

**Boundaries it implements:**

| Boundary | Reserved in Phase 0 as |
| --- | --- |
| Video provider | `services/video` — `VideoProvider`, `DirectUploadTicket`, `PlaybackGrant`, `WebhookVerifier` |
| Object storage | `StageArtifact.storageKey` |
| Database | `packages/domain/ports` + `infra/db/migrations/0001_initial_schema.sql` |
| Identity provider | `apps/web/src/server/auth/` |

**Work:** resumable direct upload; signed webhook verification with replay
rejection; asset lifecycle; truthful processing UI driven by the existing state
machine; retries; deletion that actually purges the provider; quotas; a real
identity provider with server-side sessions, revocation, recovery, and rate
limiting; PostgreSQL adapter behind the existing ports; row-level security as
defence in depth.

**Exit when** multiple real full games can be uploaded, played, retried, and
deleted reliably — and a deletion test proves every derivative is unreachable
afterwards.

---

## Phase 2 — Target-player identification · **not started**

**Boundaries:** `services/vision` — `DetectionRequest`, `TrackingRequest`,
`IdentityProposal`; domain `Track`, `IdentityEvidence`.

**Work:** GPU processing, detection, multi-object tracking, jersey OCR, uniform
colour, appearance embeddings, court continuity, substitution timing, and the
human-confirmation interface.

The output is not a bounding box; it is a versioned target-player track with
confidence and corrections. `needsHumanConfirmation` already encodes the rule
that no single weak signal promotes a track.

**Requires legal review first:** appearance embeddings and jersey OCR used for
identity may fall under biometric statutes. See `docs/PRIVACY_AND_SECURITY.md`.

**Exit when** the pilot player stays correctly identified across a
representative set of possessions, with uncertainty surfaced.

---

## Phase 3 — Candidate decision discovery · **not started**

**Boundaries:** `packages/ai` — `frame_window_summary`,
`decision_candidate_rank`; domain `Possession`, `DecisionCandidate`;
`packages/evals`.

**Work:** possession segmentation; the cheap first pass proposing timestamps;
evidence-window assembly; the expensive second pass over short windows only; an
internal evaluation console comparing predictions to the benchmark.

**Prerequisite:** the benchmark must be labelled first. Building discovery
without it means having no way to tell whether a change helped.

**Exit when** the system finds a useful small set of moments and false positives
are manageable for a coach.

---

## Phase 4 — Coach-aware analysis and player learning · **partly prototyped**

Already built in Phase 0: the questionnaire producing versioned citable rules,
the review queue separating observation from inference, approval publishing a
learning moment, assignments, and the full player session.

**Still to build:** `coach_rule_match`, `decision_analysis`,
`coach_review_assist`, `player_question`, `player_explanation`, and
`session_recommendation` against a real provider; a revisit queue driven by
reflections; recurring-cue reporting.

**Exit when** a coach says the explanations represent their system and players
complete sessions without assistance.

---

## Phase 5 — Pilot hardening and commercialization · **not started**

Team onboarding, permissions administration, billing, cost controls, support
tooling, retention automation, analytics, accessibility audit, mobile polish,
production operations.

**Expand only after** evidence that players repeatedly use sessions and coaches
save meaningful time.

---

## What Phase 1 must not break

Constraints Phase 0 established that later work inherits:

1. Decision quality and outcome stay separate. No boolean correctness, ever.
2. `provenance` stays required. Manual data is never labelled AI-generated; an
   AI proposal is never labelled coach-approved.
3. Only coach-approved or manually authored content reaches a player.
4. An interpretation citing no coach rule declares `no_applicable_coach_rule`.
5. Authorization stays in the data-access layer.
6. No provider URL is stored or returned to a client.
7. Nothing claims a service is connected when it is not.
