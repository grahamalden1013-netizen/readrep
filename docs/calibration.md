# Calibration workflow (game 4c059938, temporary)

Purpose: the v2 full-game baseline produced **0 candidates from 127 windows**.
That shows precision improved but leaves **recall unknown**, and the run used
scout-frame stand-ins rather than genuine coach-clicked crops. This workflow
measures both against a small human gold set — **without tuning the pipeline**.

## 1. Label the gold set

Owner-only route (RLS-gated — a signed-out or other-account request 404s):

```
/games/4c059938-44f6-4377-87b4-76f619d1788f/calibrate
```

- Full playable game video, scrub / play-pause / ±5s / frame-step (±1/30s),
  visible timestamp (`m:ss.ss`).
- **First**: save **2–3 genuine references** of white #15 — seek to a clear
  frame, click the player (browser crop), mark whether the number is readable.
  At least one crop must have the number readable. These replace the scout
  stand-ins for the eval.
- Then label:
  - **Mark real decision** — clip start, exact decision point, clip end, a
    click on the target at the decision frame, the committed action, a short
    "why this is a real read".
  - **Mark non-decision** — clip start/end, a target click, and a reason it is
    not a decision.
- Target: **5 real decisions + 5 non-decisions** involving / showing white #15.
- Labels persist in `nextrep.calibration_labels` (survive refresh), are
  editable and deletable, and are **never published as reps**.

## 2. Run the evaluation

Once 10 labels + the references exist:

```sql
-- dump the bundle the eval reads (run as the owner, or via service access)
copy (
  select json_build_object(
    'references', (select json_agg(json_build_object(
        'timestampSeconds', timestamp_seconds, 'crop', crop, 'numberVisible', number_visible))
      from nextrep.calibration_references
      where game_id = '4c059938-44f6-4377-87b4-76f619d1788f'),
    'labels', (select json_agg(row_to_json(t)) from (
        select id, kind, clip_start_seconds  as "clipStartSeconds",
               decision_seconds as "decisionSeconds", clip_end_seconds as "clipEndSeconds",
               actual_action as "actualAction", note, rejection_reason as "rejectionReason"
        from nextrep.calibration_labels
        where game_id = '4c059938-44f6-4377-87b4-76f619d1788f') t)
  )
) to stdout;
-- save the single JSON line to scratchpad/calibration-bundle.json
```

```
npx tsx --conditions=react-server scripts/calibration-eval.ts
```

For each gold **positive** it reports: discovery `decision:true`? gate pass?
verifier pass? target correct (verifier)? pause within 1.5 s of the human label?
For each gold **negative**: rejected? at which stage? with what reason?

Report metrics: positive recall (/5), negative precision (/5),
target-identification accuracy, pause-point accuracy, discovery/gate/verifier
breakdown, added cost, and the exact disagreements. It also prints a diagnosis
of *where* any missed positive failed (bad references / frame density / window
cutting / conservative discovery / model not seeing the commitment) — **not** a
suggestion to loosen the gate.

## Acceptance target for the NEXT iteration

- ≥ 4 / 5 real decisions detected
- 5 / 5 non-decisions rejected
- ≥ 4 / 5 detected pauses within 1.5 s
- no wrong-player candidate accepted

Thresholds are **not** changed during this first calibration evaluation.
