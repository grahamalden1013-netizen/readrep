# AI Rep Copilot

NextRep's first AI capability. A coach picks **one short possession** in a real
uploaded game, marks the decision timestamp, and clicks **Draft with AI**.
NextRep pulls ~15 real frames from that exact clip, sends them to the OpenAI
Responses API, and returns a strictly‑structured **draft rep for human review**.

This is **not** automatic full‑game analysis. It analyses only the clip window
the coach selected. The successful milestone is one useful, evidence‑backed AI
draft that a coach reviews and pushes through the existing Preview → Publish flow.

> **AI can be wrong.** Every AI output is a draft. The coach is responsible for
> reviewing it. This milestone does not automatically find every decision in a
> full game. Uploaded youth footage requires appropriate permission and careful
> handling.

## Enabling it

Set these **server‑only** variables (never `NEXT_PUBLIC_`, never committed):

```env
OPENAI_API_KEY=sk-...
OPENAI_REP_MODEL=gpt-5.6-terra          # optional; this is the default
OPENAI_REP_MODEL_FALLBACK=gpt-5.1       # optional; explicit, visible fallback
# OPENAI_REP_PRICE_INPUT=               # optional cost-estimate override (USD / 1M tokens)
# OPENAI_REP_PRICE_OUTPUT=
```

The Copilot appears in Studio only when **all** of:

- `OPENAI_API_KEY` is set
- Supabase is configured (durable jobs live in `nextrep.ai_rep_analysis_jobs`)
- the game has a **ready Mux video with a playback id**

Apply the migration: `supabase/migrations/0002_ai_rep_analysis_jobs.sql`.

## Architecture

A clean intelligence boundary — the OpenAI SDK is never touched from a React
component or a DB class.

```
lib/ai/
  config.ts          isAiConfigured / assertAiConfigured (no SDK, no key value)
  errors.ts          AiError (safe codes + user messages), toAiError()
  limits.ts          clip / frame / concurrency / confidence constants
  cost.ts            estimateCost() — labelled an estimate, never "free"
  schemas.ts         aiRepResultSchema (strict Zod) + validate + form mapping + PROMPT_VERSION
  prompts.ts         buildRepCopilotPrompt() — versioned, tested
  provider.ts        RepAiProvider interface
  openai-provider.ts OpenAiRepProvider — Responses API, image inputs, usage, timeouts
  index.ts           getRepAiProvider() (server-only)

lib/video/
  frame-source.ts        FrameSource interface + planFrameTimestamps() (pure)
  mux-frame-source.ts    MuxFrameSource — server-side timestamped Mux thumbnails

lib/db/ai-jobs.ts        aiJobs.* — durable job state, RLS-scoped (no extra getUser on reads)

lib/actions/
  ai-rep.ts          draftRepWithAI / getAiRepJob / getLatestAiRepJobForGame  ("use server")

components/studio/
  ai-rep-copilot.tsx     the Studio UI section (client) — actions + types only
  rep-studio.tsx         renders <AiRepCopilot>, owns Apply-to-form
```

Responsibilities:

| Layer | Owns |
|---|---|
| `ai-rep-copilot.tsx` | presentation, coach interaction, polling, Apply/Regenerate/Discard |
| `draftRepWithAI` (server action) | auth, ownership, video readiness, clip validation, rate limits, dedup, job lifecycle, revalidation |
| `MuxFrameSource` | timestamped frame retrieval + normalisation + payload limits |
| `OpenAiRepProvider` | the OpenAI Responses request; usage / latency; nothing else |
| `aiRepResultSchema` + `validateAiRepResult` | strict validation, evidence-timestamp verification, confidence gates |
| `nextrep.ai_rep_analysis_jobs` + RLS | durable job state + audit metadata, one owner only |
| existing `saveRepDraft` / `RepPreviewModal` | Preview and Publish — unchanged |

## Why the whole video is not sent to OpenAI

A 40‑minute upload is gigabytes. For one rep we need the *decision*, not the
game. `MuxFrameSource` fetches **still frames** from Mux's public thumbnail
endpoint server‑side:

```
https://image.mux.com/{publicPlaybackId}/thumbnail.webp?time={seconds}&width={px}
```

No Mux credentials are needed for a public playback policy; if playback ever
becomes **signed**, only `MuxFrameSource` changes (it would mint a short‑lived
token there) and the token / signed URL never leave the server or appear in an
error.

## Frame sampling

`planFrameTimestamps(clip)` is a pure, tested function. It produces chronological
timestamps weighted toward the decision:

```
clip start
25% / 50% / 75% between clip start and decision   (offensive + defensive alignment)
decision − 1.50s / − 0.75s / − 0.25s
decision
decision + 0.25s / + 0.75s / + 1.50s              (immediate action)
25% / 50% / 75% between decision and clip end
clip end                                          (outcome)
```

Guarantees: sorted ascending, deduped on a 100 ms grid, every value clamped to
`[clipStart, clipEnd]`, at least 8 and at most 18 frames, denser within ±1.6 s of
the decision. A short clip is filled evenly to the minimum; a long span is
thinned at the ends, never around the decision.

`MuxFrameSource` then, sequentially: fetches each `webp` at **852 px** (the test
asset's stored resolution — larger just upscales), attaches the source
timestamp, enforces per‑frame and total‑payload ceilings, applies per‑frame and
whole‑batch timeouts, and aborts with a safe error if fewer than 8 frames come
back. Raw bytes are **never persisted** — they are base64‑encoded in memory,
sent, and dropped.

The provider sends each frame with `detail: "high"` so jersey numbers stay
legible; `"low"` downsamples every frame to 512 px and makes identification
impossible.

## Model configuration

- Primary: `OPENAI_REP_MODEL` or `gpt-5.6-terra`.
- Fallback: `OPENAI_REP_MODEL_FALLBACK` or `gpt-5.1`, used **only** when the
  primary is unavailable (`model-unavailable` / `provider-unavailable`). When it
  runs, `model_fallback_used = true` is recorded on the job and shown in the UI.
- `capabilityCheck()` does a minimal 16‑token Responses call to confirm access
  before relying on a model; a failure surfaces as a clean configuration error.
- No legacy or unrelated model is ever silently substituted.

## Player identification

The request includes trusted metadata from the game record (jersey number, team
colour, optional marker, clip timestamps). The model is told plainly that
**metadata is not proof of visibility**. It must decide from the frames whether
the target player is identifiable. If the number is unreadable, the player is
off‑screen, several players could match, or it is otherwise uncertain:

- `targetPlayerVisible: false`, low `targetIdentificationConfidence`, a warning,
  every rep‑draft field `null`
- the UI shows: *"We couldn't reliably identify white #15 in this clip. Choose a
  moment where the jersey number or player is clearer."*

## Structured output + validation

`aiRepResultSchema` is the gate. Nothing that fails it reaches the Studio form.
`validateAiRepResult(raw, clip)` additionally:

- verifies **every `visibleEvidence.timestampSeconds` against the submitted clip**
  (± 0.75 s for frame rounding); out‑of‑clip items are dropped with a warning,
  and too many drops fail the result — model‑invented timestamps cannot survive
- requires evidence to be chronological
- requires 2–4 **unique, concrete** answer choices (placeholders rejected) with
  exactly one `bestReadChoiceId`; `actualDecisionChoiceId` may be `null`
- constrains `skillCategory` to NextRep's five categories or `null` — the model
  is told **never to invent one**

### Confidence gates

| Condition | Result |
|---|---|
| `targetPlayerVisible` false, or id confidence < 0.55 | **not usable** — no draft presented as reliable |
| overall confidence < 0.50 | usable **as notes only** — one‑click Apply blocked, stronger warnings required |
| 0.50 ≤ overall confidence < 0.60 | Apply allowed, but a "review every field" warning is shown |
| overall confidence ≥ 0.60 and target visible | Apply allowed |

Missing draft fields (e.g. a null skill category) never block Apply — Apply fills
what exists, the coach completes the rest, and the **existing publish gate**
(`validateRepDraft`) still enforces completeness.

## Human review

- Results show as **"AI draft — review required"** with model, confidence,
  target‑identification confidence, clickable evidence timestamps (they seek the
  Studio player), inferences with their own confidence, and warnings.
- Nothing is written to the form automatically. **Apply to empty fields** fills
  blank fields only; **Replace all** overwrites; both mark AI‑sourced fields with
  an "AI" chip and leave every field editable.
- **Regenerate** re‑runs the analysis; **Discard** clears it.
- The rep is published through the unchanged `saveRepDraft` server action and its
  Preview modal. AI output cannot bypass rep validation and cannot auto‑publish.

## Durable jobs

`nextrep.ai_rep_analysis_jobs` holds one row per analysis with status, phase,
clip, target metadata, provider, model, `model_fallback_used`, `prompt_version`,
the validated+gated `result_json`, `warnings_json`, a safe `error_code` /
`error_message_safe`, token counts, `estimated_cost_usd`, `latency_ms`, and
timestamps. **No API key, no Mux URL, no image bytes are ever stored.**

- RLS restricts every row to `owner_id = auth.uid() AND owns_game(game_id)`.
  A signed‑out caller matches nothing; one user cannot read or write another's
  jobs; a job can only target a game the caller owns.
- A partial unique index `(game_id, clip_start, decision, clip_end) WHERE status
  IN ('queued','running')` enforces **one active analysis per identical clip**.
- The heavy work runs in `after()` and updates the row's `phase`
  (`preparing-frames → studying → building-draft → done`). Studio polls
  `getAiRepJob` every 4 s for honest phases — **no fake percentages**.
- A completed result is reused for a repeat click on the same clip (no new
  spend). `getLatestAiRepJobForGame` restores state after a page refresh.
- A queued/running job with no progress for `PROVIDER_TIMEOUT_MS + 60s` is
  treated as dead, marked failed, and is retryable.
- Failed jobs show a safe message and a **Retry** (with `regenerate: true`).

## Rate limits and cost

| Control | Value |
|---|---|
| clip length | 5 – 20 s |
| frames per request | 8 – 18 |
| frame width | 852 px (`detail: "high"`) |
| max total image payload | 6 MB (real runs ≈ 0.7 MB) |
| max single frame | 1.5 MB |
| frame fetch timeout | 8 s each, 30 s batch |
| provider timeout | 120 s |
| concurrent analyses / user | 1 |
| analyses / user / hour | 20 |
| poll interval | 4 s |

`estimateCost(model, usage)` returns a **clearly labelled estimate** from a
configurable per‑1M‑token price table. Analysis is **not free**. A representative
real run: 13 frames, ~9,300 tokens, **≈ $0.026 estimated**, ~24 s.

Analysis runs **only** on an explicit "Draft with AI" (or Retry) click — never on
render, route prefetch, timestamp change, or pressing Play.

## Failure states

`AiError` codes, each with a safe message and a retryable flag:

`not-configured`, `model-unavailable`, `quota` (operator must act) ·
`rate-limited`, `timeout`, `provider-unavailable`, `frames-unavailable`,
`storage-failed` (retry is reasonable) · `video-not-ready`, `invalid-clip`,
`clip-too-long`, `clip-too-short`, `unauthorized`, `not-found` (adjust the
request) · `target-not-visible`, `low-confidence` (results of the evidence, not
system errors) · `invalid-output`, `duplicate-job`, `rate-exceeded`.

Errors never include the API key, provider URLs, raw provider responses, or stack
detail, and never wipe the coach's form.

## Running the opt-in real-provider test

The normal suite (`npm test`, glob `test/*.test.ts`) never spends OpenAI credits.
The real integration test is `test/ai-real-provider.integration.ts` — run it
deliberately:

```
RUN_AI_INTEGRATION=1 \
PLAYBACK_ID=<public mux playback id> \
CLIP_START=1955 DECISION=1961 CLIP_END=1967 \
TARGET_JERSEY=15 TARGET_COLOR=white \
node --conditions=react-server --import tsx --test test/ai-real-provider.integration.ts
```

It retrieves real Mux frames, calls the real model, validates through Zod, checks
every evidence timestamp against the clip, and prints latency / tokens / cost.
`--conditions=react-server` neutralises `server-only` outside Next.

## Current limitations

- One coach‑selected possession at a time. No full‑game candidate discovery, no
  player tracking.
- Identification leans on jersey legibility + cross‑frame continuity; broadcast
  footage often makes a clean number read impossible, and the model will (and
  should) return `targetPlayerVisible: false` rather than guess.
- `after()` keeps the worker alive on a long‑lived server (`next start`) and on
  Vercel Fluid Compute; if an instance is killed mid‑analysis the job is
  reclaimed as stale and the coach retries.
- Outcomes are reported only from the supplied frames — the true result of a
  shot after the clip is explicitly left uncertain.
- The cost figure is an estimate from a static price table, not a billed amount.
