<!--
  SOURCE OF TRUTH — do not paraphrase or trim this file.

  This is a faithful Markdown conversion of `ReadRep_Product_and_Build_Blueprint.docx`
  (Version 1.0, August 2026), which the document footer marks "Confidential working
  blueprint". Every paragraph in the source document is reproduced here. The only
  changes are structural rendering: Word heading styles became Markdown headings,
  Word tables became Markdown tables, ListBullet/ListNumber paragraphs became
  Markdown lists, and the document's single-cell emphasis boxes became blockquotes
  with their label in bold.

  Conversion was verified programmatically: every paragraph of the source
  word/document.xml appears in this file, with no characters dropped.

  If the .docx is revised, re-convert rather than editing this file by hand, and
  reconcile any implementation that depended on the previous wording.
-->

# ReadRep — Product & Build Blueprint

_An AI-powered basketball decision-training system built from a player's real game film_

> **THE PRODUCT PROMISE**
>
> Turn full-game basketball video into coach-approved, interactive decision repetitions: pause, decide, reveal, learn.

**Version 1.0** | August 2026

Working name: ReadRep (also previously referred to as RedRep)

# 1. Executive Summary

ReadRep is an AI-powered basketball film and learning platform for youth, high-school, AAU, and development programs. A coach, parent, or player uploads a complete game. ReadRep identifies a selected player, finds moments in which that player had a meaningful decision, grounds its analysis in the team’s coaching system, and converts those moments into interactive learning repetitions.

ReadRep is not primarily a highlight generator, box-score tool, or generic film library. Its purpose is to transform passive film review into active decision practice. The player must make the read again before seeing what happened, then receives an explanation approved by the coach.

> **CORE DIFFERENTIATION**
>
> Most platforms help teams watch what happened. ReadRep asks the player to decide again, reveals the outcome, and teaches the visual cue they should recognize next time.

## Product thesis

Basketball intelligence improves through correctly timed repetitions. Players need practice recognizing the cue before the decision—not only an explanation after the possession is over. ReadRep creates those repetitions from the player’s own games, where the context and emotional relevance are highest.

## Initial customer

The best early customer is one competitive AAU or high-school team with a coach who already values film study. The first pilot should be intentionally small: one coach, one team, two or three players, and several games. The goal is to prove that the learning workflow is valuable before automating every technical step.

# 2. Product Principles

Decision quality is not outcome quality. A good shot can miss and a bad decision can produce a basket. Analysis must evaluate the read separately from the result.

The coach’s system is the authority. ReadRep supports the coach’s philosophy. It must not invent team rules or overrule the coach.

Uncertainty must be visible. When player identity, off-screen context, or basketball meaning is unclear, the product should ask for confirmation rather than pretend certainty.

Active learning beats passive watching. The player commits to an answer before the clip reveals the outcome.

Real clips, short explanations. Learning sessions should feel fast, specific, and repeatable—not like long AI essays.

Private by default. Youth game video, player identity, and coaching data require strong access controls, deletion, and controlled sharing.

Human review before authority. Early versions should require coach approval before an AI interpretation becomes assigned instruction.

# 3. Users and Jobs to Be Done

| User | What they need | What success feels like |
| --- | --- | --- |
| Player | Understand decisions, practice reads, and know what to recognize next time. | Film becomes a short, useful workout rather than a lecture. |
| Coach | Teach the team’s system, review AI suggestions, assign clips, and track understanding. | Less time cutting film; more time coaching the decisions that matter. |
| Parent | Upload games, manage access/subscription, and support development safely. | Clear processing and progress without needing basketball-analysis expertise. |
| Program admin | Manage rosters, roles, teams, storage, consent, and billing. | One controlled workspace across multiple teams. |
| Trainer | Use player-specific film to guide individual development. | Training sessions connect directly to real-game decisions. |

# 4. The Core Experience

## 4.1 Upload a complete game

A coach, parent, or authorized player uploads a full game. The product collects only the context needed to process it accurately:

- Team and opponent
- Game date and level
- Target player name and jersey number
- Uniform color and direction of play
- Whether the player started
- Areas the user wants reviewed
- Consent and sharing settings

The upload must be resumable. The user should see honest stages such as uploading, securing, transcoding, preparing frames, awaiting player confirmation, analyzing candidate moments, and awaiting coach review. Each completed stage is persisted so a failure does not erase prior work.

## 4.2 Confirm and track the target player

ReadRep proposes one or more candidate players using jersey number, uniform color, court position, motion, and appearance cues. The user confirms the target at selected checkpoints. Human confirmation is a core part of the product—not an embarrassing fallback—because youth-game footage contains blur, occlusion, substitutions, bench time, camera movement, and inconsistent jersey visibility.

## 4.3 Discover decision moments

The system divides the game into possessions and searches for moments with a meaningful choice. It should prefer a small set of teachable moments over dozens of low-confidence clips.

| Offensive examples | Defensive examples |
| --- | --- |
| Pick-and-roll coverage reads | Help, recover, and low-man rotations |
| Drive, pass, finish, or pull-up | Screen navigation and switching |
| Attacking a closeout | Closeout angle and discipline |
| Relocation, cutting, and spacing | Tagging rollers and protecting the paint |
| Transition advantage decisions | Transition matchups and communication |
| Shot selection and late-clock choices | Box-outs and off-ball positioning |

## 4.4 Ground analysis in the coach’s system

The coach completes a focused system survey containing roughly 10–20 core questions with optional follow-ups. Answers form the team rulebook used during analysis. Topics include offensive structure, spacing, transition priorities, pick-and-roll rules, shot profile, defensive coverages, switching, help responsibilities, closeouts, and rebounding assignments.

> **GROUNDING RULE**
>
> If the coach has not supplied a rule, ReadRep must label its advice as general basketball reasoning—not claim it is the team’s required decision.

## 4.5 Coach review

Every candidate moment enters a review queue. The coach can approve, reject, edit, recategorize, choose the preferred option, add a note, mark confidence, and assign the moment. The system records corrections so future recommendations can become more consistent with that coach.

## 4.6 Player session: pause → decide → reveal → learn

| Stage | Experience |
| --- | --- |
| Pause | The clip stops immediately before the relevant choice becomes obvious. |
| Decide | The player chooses an action, identifies a defender or teammate, taps a court area, or explains what they see. |
| Reveal | The clip continues. Trusted overlays may identify players, space, passing lanes, or responsibilities. |
| Learn | ReadRep gives a concise, coach-grounded explanation: the cue, the options, the preferred read, and what to notice next time. |
| Reflect | The player can state what they missed and save the moment for later repetition. |

# 5. Product Surfaces

| Surface | Essential capabilities |
| --- | --- |
| Public site | Clear value proposition, demo session, privacy explanation, pilot request, pricing placeholder. |
| Authentication | Role-aware accounts, team invitations, parent/guardian pathways, secure recovery, session revocation. |
| Upload center | Resumable uploads, game metadata, consent, progress, retry, and processing history. |
| Player confirmation | Candidate tracks, timeline checkpoints, correction tools, and confidence indicators. |
| Coach system setup | Focused survey, terminology, editable rules, version history, and team defaults. |
| Coach review queue | Candidate clips, evidence, confidence, approve/edit/reject, batch operations, assignments. |
| Player learning | Pause-decide-reveal-learn sessions, keyboard/touch controls, reflection, revisit queue. |
| Coach dashboard | Assignments, completion, recurring patterns, player-level evidence, and team trends. |
| Player dashboard | Next session, recent clips, recurring cues, coach feedback, and improvement history. |
| Administration | Teams, rosters, permissions, consent, storage, retention, audit log, and billing. |

# 6. Recommended Technical Architecture

The architecture should separate the interactive web product from long-running video and AI jobs. Every job must be idempotent, restartable, observable, and linked to durable artifacts. Vendors can change; interfaces and data ownership should remain under ReadRep’s control.

| Layer | Recommended responsibility |
| --- | --- |
| Web application | Next.js + TypeScript for authenticated dashboards, review tools, sessions, and APIs. |
| Database | Managed PostgreSQL with Prisma or equivalent typed access; row-level ownership enforced in every query path. |
| Video ingestion/playback | Mux or an equivalent provider for resumable upload, transcoding, secure playback, webhooks, and thumbnails. |
| Object storage | Private storage for derived frames, crops, embeddings, overlays, and analysis artifacts. |
| Job orchestration | Durable workflow engine or queue with retries, timeouts, idempotency keys, and stage persistence. |
| GPU compute | Modal or equivalent for detection, tracking, embeddings, frame extraction, and batch inference. |
| Computer vision | Detector + multi-object tracker + court/jersey/context features, with human checkpoints. |
| AI reasoning | Provider-abstracted vision/reasoning operations returning strict schemas; no monolithic prompt. |
| Observability | Structured logs, traces, job timelines, cost records, error reporting, and privacy-safe diagnostics. |
| Deployment | Vercel for the web tier plus independent worker/GPU services; production secrets held server-side. |

## 6.1 End-to-end data flow

1. Create Game record and authorize an upload.
1. Upload directly to the video provider; the application never proxies the full file through a web request.
1. Receive a signed webhook and mark the asset ready only after verifying the webhook signature and idempotency key.
1. Create a durable processing run containing individually persisted stages.
1. Extract low-rate frames and possession boundaries before expensive high-resolution work.
1. Generate candidate player tracks; pause for human confirmation when confidence is insufficient.
1. Discover candidate decisions and store evidence timestamps, crops, track IDs, and confidence—not just prose.
1. Run basketball interpretation against the evidence plus the versioned coach-system document.
1. Send candidates to coach review; publish only approved learning items.
1. Render the player session from trusted structured data and secure video timestamps.

# 7. Video Intelligence Pipeline

## Stage A — Ingest and normalize

- Validate format, duration, resolution, and ownership.
- Create streamable renditions and thumbnails.
- Normalize timestamps and store provider asset identifiers.
- Detect basic game boundaries, stoppages, and camera cuts.
- Do not perform expensive analysis until the video asset is confirmed ready.

## Stage B — Court, players, and possessions

- Detect the court and estimate camera/court geometry where footage permits.
- Detect players, officials, and ball candidates with confidence values.
- Associate detections into tracks across frames.
- Classify teams using uniform appearance and confirmed examples.
- Segment possessions using motion, court direction, transitions, and stoppages.
- Retain uncertainty and evidence for later review.

## Stage C — Target-player identity

Identity is a probabilistic evidence problem. ReadRep should combine jersey-number OCR, uniform color, appearance embeddings, court continuity, substitution timing, and user confirmations. A track should never be promoted to ‘confirmed player’ from one weak signal.

## Stage D — Candidate decision discovery

Use a two-pass process. A cheaper detector proposes timestamps from movement, possession state, screens, drives, passes, shots, rotations, and spacing changes. A stronger vision/reasoning operation then evaluates only those short windows. This reduces cost and keeps evidence focused.

## Stage E — Coach-aware interpretation

Each interpretation receives a bounded evidence bundle: selected frames or a short clip, target-player track, possession metadata, candidate event, relevant coach rules, and allowed output categories. It returns a strict schema containing observation, options, preferred read, rationale, missed cue, confidence, uncertainty, and rule citations.

## Stage F — Human review and publication

Coach edits are first-class records. The system stores the original proposal, the final approved version, reviewer identity, reason for rejection, and relevant coach-system version. Player-facing content is generated only from the approved record.

# 8. AI Operation Design

Avoid one mega-prompt. Build narrow operations with strict inputs, outputs, timeouts, model tiers, logging, fallbacks, and evaluation fixtures.

| Operation | Purpose | Required output |
| --- | --- | --- |
| frame_window_summary | Describe only visible events in a short window. | Observations + visibility limits |
| decision_candidate_rank | Rank whether a timestamp is teachable. | Category, score, evidence |
| coach_rule_match | Identify which supplied team rules apply. | Rule IDs + rationale |
| decision_analysis | Evaluate options without confusing result and decision. | Options, read, cue, confidence |
| coach_review_assist | Prepare a concise editable draft for the coach. | Draft explanation + questions |
| player_question | Create the pre-reveal interaction. | Prompt, response type, choices |
| player_explanation | Create concise approved teaching language. | What happened, cue, next-time rule |
| session_recommendation | Choose the next useful repetitions. | Moment IDs + reason |

## AI safeguards

- Structured outputs validated by domain schemas before adoption.
- Every claim linked to timestamps, frame IDs, track IDs, and applicable coach-rule IDs.
- Explicit distinction among observed fact, basketball inference, coach rule, and uncertainty.
- No analysis of events outside the visible camera frame unless labeled unknown.
- Provider abstraction so models can be replaced without rewriting product logic.
- Prompt/version tracking and regression evaluations before model changes reach production.
- Cost and latency recorded for every operation without logging private media or secrets.

# 9. Core Data Model

| Entity | Important fields and relationships |
| --- | --- |
| User / Membership | Identity, role, team, permissions, guardian relationship, status. |
| Team | Program, season, roster, coach-system version, privacy defaults. |
| Player | Team membership, jersey history, consent state, user linkage. |
| Game | Teams, date, status, uploader, target players, access policy. |
| VideoAsset | Provider IDs, duration, renditions, secure playback, retention state. |
| ProcessingRun / Stage | Version, status, attempts, timestamps, cost, failure, idempotency. |
| Track / IdentityEvidence | Frame ranges, detection confidence, team, candidate player, confirmation. |
| Possession | Start/end timestamps, direction, team control, derived events. |
| DecisionCandidate | Timestamp, category, evidence, confidence, model/prompt versions. |
| CoachSystem / Rule | Versioned team principles, terminology, applicability. |
| CoachReview | Original, edited, verdict, reviewer, comments, approved state. |
| LearningMoment | Approved clip window, question, answer form, explanation, tags. |
| Assignment / Attempt | Player, session, response, completion, reflection, revisit. |
| AuditEvent | Actor, action, resource, time, security context, safe metadata. |

# 10. Security, Privacy, and Youth Safety

> **NON-NEGOTIABLE**
>
> ReadRep processes video and performance information involving minors. Privacy and permissions are product requirements, not paperwork to add after launch.

- Private-by-default teams, games, clips, and profiles.
- Role-based authorization enforced in database queries—not only hidden buttons.
- Signed direct uploads, signed webhooks, time-limited playback, and no public storage URLs.
- Documented parent/guardian and organization consent flows appropriate to the pilot context.
- No public player rankings, embarrassing labels, or automatic recruiting claims.
- Configurable retention and complete deletion covering originals, derivatives, model artifacts, and backups where feasible.
- Audit logs for viewing, sharing, downloading, coaching changes, and administrative actions.
- Minimal personal data collection; secrets remain server-side and are redacted from logs.
- Rate limits, upload quotas, file validation, malware scanning where applicable, and abuse reporting.
- Formal legal review before broad commercial use, particularly for minors, schools, biometric-like identity features, and educational records.

# 11. MVP: What to Build First

The MVP should validate the learning loop before attempting perfect full-game automation. A partially manual pipeline is acceptable; a fake automated experience is not.

| Include in MVP | Delay until evidence exists |
| --- | --- |
| One team and a small pilot roster | Multi-program enterprise administration |
| Secure upload and playback | Every video format and camera system |
| Manual/semi-automatic player confirmation | Fully autonomous identity across all games |
| Human-selected or assisted decision clips | Universal event detection |
| Coach-system survey and review | AI acting as final coaching authority |
| Pause-decide-reveal-learn player sessions | Public rankings or recruiting profiles |
| Basic assignments and completion | Advanced predictive IQ scoring |
| Real privacy, deletion, and audit controls | Social feeds and broad sharing |

# 12. Staged Build Plan

## Phase 0 — Foundation and pilot definition

- Confirm one pilot coach and obtain sample game footage with permission.
- Write the exact learning-session acceptance standard.
- Create threat model, data-retention policy, roles, and consent flow.
- Define the canonical schemas and processing-state machine.
- Build a benchmark set of 20–30 manually labeled decision moments.

## Phase 1 — Production-grade full-game upload

Implement secure resumable upload, Mux-style asset lifecycle, signed webhooks, playback authorization, game records, truthful processing UI, retries, deletion, quotas, and observability. Exit only when multiple real full games can be uploaded, played, retried, and deleted reliably.

## Phase 2 — Target-player identification and tracking

Build GPU processing, candidate tracks, jersey/team cues, identity evidence, and the human-confirmation interface. The output is not merely a bounding box; it is a versioned target-player track with confidence and corrections. Exit when the pilot player remains correctly identified across a representative set of possessions, with uncertainty surfaced.

## Phase 3 — Candidate decision discovery

Segment possessions, propose timestamps, assemble evidence windows, and run bounded vision analysis. Build an internal evaluation console comparing predictions to the benchmark set. Exit when the system consistently finds a useful small set of moments and false positives are manageable for a coach.

## Phase 4 — Coach-aware analysis and player learning

Complete the coach-system survey, rule grounding, coach review queue, approved learning moments, assignments, and pause-decide-reveal-learn sessions. Exit when a coach says the explanations represent their system and players complete sessions without assistance.

## Phase 5 — Pilot hardening and commercialization

Add reliable team onboarding, permissions, billing, cost controls, support tools, retention, analytics, accessibility, mobile polish, and production operations. Expand only after evidence that players repeatedly use sessions and coaches save meaningful time.

# 13. Quality-Control Strategy

## Technical gates

- Type checking, linting, unit tests, integration tests, production build, and end-to-end tests.
- Webhook signature and replay tests; upload interruption and resume tests.
- Cross-account authorization tests for every game, clip, team, player, and export route.
- Idempotency and retry tests for every processing stage.
- Mobile, tablet, and desktop browser verification with keyboard and screen-reader checks.
- Deletion tests proving all linked derivatives and access paths are removed.

## Basketball/AI evaluation gates

- Player identity accuracy measured on representative youth-game footage, not polished broadcast video.
- Decision discovery precision and coach-rated usefulness measured separately.
- Explanation factuality checked against visible evidence and coach rules.
- Good-decision/bad-outcome and bad-decision/good-outcome test cases.
- Off-screen uncertainty, occlusion, substitutions, similar jerseys, and camera-cut stress tests.
- Model and prompt changes evaluated against a fixed regression set before deployment.

## User-experience gates

- A parent can upload without technical help.
- A coach can review a moment quickly and understand why it was proposed.
- A player understands the interaction without reading instructions.
- The pause occurs before the answer is obvious.
- Feedback is concise, specific, respectful, and clearly tied to the coach’s system.
- Processing states never imply work has completed when it has not.

# 14. Metrics That Matter

| Category | Metric |
| --- | --- |
| Activation | Percentage of uploaded games that reach one approved learning moment. |
| Coach value | Median review time per useful moment; percentage approved or meaningfully edited. |
| Player value | Session completion, repeat sessions, revisit rate, and recognition improvement. |
| Model quality | Identity accuracy, useful-candidate precision, grounded explanation rate. |
| Reliability | Upload completion, processing success, retry recovery, time to first moment. |
| Economics | Video, GPU, model, and storage cost per processed game and approved moment. |
| Trust | Deletion success, access incidents, permission errors, complaints, coach confidence. |

Avoid inventing a single ‘basketball IQ score’ until it has a defensible definition and evidence. Early reporting should describe observable patterns with linked clips.

# 15. Key Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Tracking is unreliable on poor footage | Human checkpoints, confidence thresholds, supported-footage guidance, and narrow pilot conditions. |
| AI gives generic or incorrect coaching | Coach-system grounding, evidence citations, strict schemas, coach approval, and regression evaluation. |
| Processing costs become too high | Two-pass candidate filtering, sampled frames, batching, quotas, cached artifacts, and cost telemetry. |
| Coaches do not trust or review suggestions | Design review around speed, show evidence, allow quick corrections, and start with a committed pilot coach. |
| Players treat sessions as punishment | Short sessions, respectful language, balanced positive/negative moments, and visible progress. |
| Privacy concerns block adoption | Private defaults, explicit consent, controlled sharing, deletion, audit logs, and legal review. |
| Scope expands into every basketball feature | Protect the core: real film → decision moment → coach approval → player repetition. |

# 16. Pilot and Launch Plan

## Pilot structure

1. Recruit one coach who already conducts film review.
1. Select two or three players with parent/guardian permission.
1. Process three to five games, initially using manual assistance where necessary.
1. Create 5–10 high-quality moments per player rather than maximizing volume.
1. Observe the coach reviewing clips and players completing sessions.
1. Interview participants immediately after each session.

## Evidence required before scaling

- The coach approves a meaningful percentage of candidate moments.
- The coach says ReadRep saves time or enables teaching they would not otherwise complete.
- Players willingly complete more than one session.
- Players can explain at least some missed cues after practice.
- Parents and the organization accept the privacy and consent model.
- Per-game processing costs support a plausible subscription price.

# 17. Definition of a Successful First Version

> **SUCCESS**
>
> A real coach uploads a real game, confirms a player, reviews useful candidate moments, assigns an approved session, and a player completes pause-decide-reveal-learn repetitions from their own film—securely, reliably, and without the product pretending to know what it cannot see.

## Acceptance checklist

- At least one complete full-game workflow works in production.
- Player identity can be confirmed and corrected.
- Every learning claim has evidence and coach-rule provenance.
- The coach can approve, edit, reject, and assign moments.
- The player session pauses at the correct instant and records a response before revealing the play.
- All video and player data are private by default with tested ownership boundaries.
- Uploads, processing, retries, and deletion behave honestly.
- The system records cost, latency, confidence, and version information.
- The pilot coach wants to use it for another game.

# 18. Product Boundaries

## ReadRep should become

- The best interactive decision-learning layer built from a player’s real game film.
- A coach-controlled extension of film teaching.
- A trustworthy library of player-specific recognition patterns over time.
- A workflow that gets more useful as coach corrections and player attempts accumulate.

## ReadRep should not become

- A generic chatbot with basketball branding.
- A highlight-reel generator competing on clip aesthetics.
- An AI coach that overrides the human coach.
- A public ranking system for minors.
- A sprawling team-management suite before the learning loop works.
- A product that hides uncertainty behind confident language.

# 19. Recommended Next Action

Before rebuilding the entire system, create a focused Phase 0 package: one pilot agreement, one representative full game, a manually labeled benchmark set, the coach-system questionnaire, the canonical decision schema, and the exact player-session prototype. Then begin Phase 1 with production-grade upload and playback.

> **BUILD ORDER**
>
> Do not begin with autonomous basketball analysis. First prove the learning experience manually, then automate ingestion, player identity, candidate discovery, and coach-aware reasoning in that order.

# Appendix A — Example Learning Moment

| Field | Example |
| --- | --- |
| Situation | Middle pick-and-roll, 7:42 in the second quarter. |
| Pause point | Ball handler reaches the screen; low defender has stepped toward the roller. |
| Question | What is your best read before taking another dribble? |
| Player choices | Hit the roller; skip to the weak-side corner; finish; pull the ball out. |
| Visible evidence | Corner defender tags the roller; weak-side corner is unattended. |
| Coach rule | Against a low tag, look weak-side before forcing the finish. |
| Preferred read | Skip pass to the weak-side corner. |
| Teaching cue | Read the defender who leaves first—not only the defender in front of you. |
| Uncertainty | Pass-window timing depends on the off-screen wing’s spacing; coach review required. |

# Appendix B — Suggested Repository Structure

Keep product domains explicit and prevent AI/video code from leaking into interactive web routes:

- apps/web — authenticated product, public site, route handlers, review and learning interfaces
- services/video — video-provider webhooks, metadata, playback authorization
- services/orchestrator — durable processing workflows and stage state machine
- services/vision — detection, tracking, court/player/possession inference
- packages/domain — schemas, permissions, decision taxonomy, coach-system model
- packages/ai — narrow operations, model adapters, prompts, validation, fallbacks
- packages/evals — labeled fixtures, regression cases, scoring, visual review tools
- packages/observability — structured logging, traces, cost and latency records
- infra — deployment configuration, queues, storage, secrets references, monitoring

# Appendix C — Handoff Instructions for an AI Coding Agent

An implementation agent should be given this blueprint plus repository access, explicit repository boundaries, available credentials, and the current state of the code. It should inspect before modifying, preserve unrelated work, use staged commits, and report evidence rather than claiming completion.

- Work only in the ReadRep repository; never modify Sidekick or other projects.
- Audit the existing architecture, tests, environment examples, and deployment before choosing replacements.
- Never print secrets or commit environment files, raw private video, derived player crops, or production database artifacts.
- Implement one phase at a time with explicit acceptance criteria and rollback points.
- Run typecheck, lint, tests, production build, browser verification, authorization attacks, and media lifecycle tests.
- Provide exact commands, results, screenshots reviewed, remaining limitations, commits, and deployment status.
- Do not use placeholder success states or pretend an external service is connected when it is not.
