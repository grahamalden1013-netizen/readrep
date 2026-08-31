"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SectionLabel } from "@/components/ui/panel";
import { formatTimecode } from "@/lib/reps/timing";
import { MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "@/lib/ai/limits";
import type { StudioFormDraft } from "@/lib/ai/schemas";
import { draftRepWithAI, getAiRepJob, type AiRepDraftView } from "@/lib/actions/ai-rep";

type ClipMs = { clipStartMs: number; decisionPauseMs: number; clipEndMs: number };

const PHASE_STEPS = [
  { key: "preparing-frames", label: "Preparing frames" },
  { key: "studying", label: "Studying the possession" },
  { key: "building-draft", label: "Building the draft" },
  { key: "done", label: "Draft ready for review" },
] as const;

const PHASE_ORDER: Record<string, number> = {
  queued: 0,
  "preparing-frames": 0,
  studying: 1,
  "building-draft": 2,
  done: 3,
  failed: -1,
};

export function AiRepCopilot({
  gameId,
  target,
  clip,
  clipValid,
  hasPlayableVideo,
  initialJob,
  onSeekSeconds,
  onApplyDraft,
  onUseClipWindow,
}: {
  gameId: string;
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  clip: ClipMs;
  clipValid: boolean;
  hasPlayableVideo: boolean;
  initialJob: AiRepDraftView | null;
  onSeekSeconds: (seconds: number) => void;
  onApplyDraft: (draft: StudioFormDraft, replaceExisting: boolean) => void;
  onUseClipWindow: (clip: ClipMs) => void;
}) {
  const [job, setJob] = useState<AiRepDraftView | null>(initialJob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clipLengthSeconds = Math.max(0, (clip.clipEndMs - clip.clipStartMs) / 1000);
  const running = job?.status === "queued" || job?.status === "running";

  const lengthOk =
    clipLengthSeconds >= MIN_CLIP_SECONDS && clipLengthSeconds <= MAX_CLIP_SECONDS;
  const canDraft = hasPlayableVideo && clipValid && lengthOk && !running && !busy;

  const disabledReason = !hasPlayableVideo
    ? "This game has no playable video."
    : !clipValid
      ? "Set clip start, decision and clip end in order first."
      : clipLengthSeconds < MIN_CLIP_SECONDS
        ? `Clip is ${clipLengthSeconds.toFixed(1)}s — needs at least ${MIN_CLIP_SECONDS}s.`
        : clipLengthSeconds > MAX_CLIP_SECONDS
          ? `Clip is ${clipLengthSeconds.toFixed(1)}s — trim to ${MAX_CLIP_SECONDS}s or less.`
          : running
            ? "An analysis is already running."
            : null;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        const res = await getAiRepJob(jobId);
        if (!res.ok) return;
        setJob(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") stopPolling();
      }, 4000);
    },
    [stopPolling],
  );

  useEffect(() => {
    if (initialJob && (initialJob.status === "queued" || initialJob.status === "running")) {
      startPolling(initialJob.jobId);
    }
    return stopPolling;
    // Only on mount — `initialJob` is the server snapshot for this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    async (regenerate: boolean) => {
      setBusy(true);
      setError(null);
      setApplied(false);
      const res = await draftRepWithAI({
        gameId,
        clipStartMs: Math.round(clip.clipStartMs),
        decisionPauseMs: Math.round(clip.decisionPauseMs),
        clipEndMs: Math.round(clip.clipEndMs),
        regenerate,
      });
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setJob(res.data);
      if (res.data.status === "queued" || res.data.status === "running") {
        startPolling(res.data.jobId);
      }
    },
    [clip.clipStartMs, clip.clipEndMs, clip.decisionPauseMs, gameId, startPolling],
  );

  const currentPhaseIndex = job ? (PHASE_ORDER[job.phase] ?? 0) : 0;

  // Is the stored/last job for a different clip than the current window?
  const jobClipMatchesWindow =
    job != null &&
    Math.abs(job.clip.clipStartSeconds - clip.clipStartMs / 1000) < 0.2 &&
    Math.abs(job.clip.decisionSeconds - clip.decisionPauseMs / 1000) < 0.2 &&
    Math.abs(job.clip.clipEndSeconds - clip.clipEndMs / 1000) < 0.2;

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionLabel>AI Rep Copilot</SectionLabel>
          <Chip tone="quiet">Beta · review required</Chip>
        </div>
        <span className="timecode text-fg-faint">
          {target.teamColor} #{target.jerseyNumber}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-fg-faint">
        Analyses only the clip window you selected — {formatTimecode(clip.clipStartMs)} to{" "}
        {formatTimecode(clip.clipEndMs)} — pulls ~15 frames around the decision, and drafts one rep for
        you to review. It does not scan the whole game and it can be wrong.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void run(false)} disabled={!canDraft}>
          {running || busy ? "Analyzing…" : "Draft with AI"}
        </Button>
        {job && !jobClipMatchesWindow && !running ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onUseClipWindow({
                clipStartMs: Math.round(job.clip.clipStartSeconds * 1000),
                decisionPauseMs: Math.round(job.clip.decisionSeconds * 1000),
                clipEndMs: Math.round(job.clip.clipEndSeconds * 1000),
              })
            }
          >
            Last run: {formatTimecode(job.clip.clipStartSeconds * 1000)}–
            {formatTimecode(job.clip.clipEndSeconds * 1000)} · use that window
          </Button>
        ) : null}
      </div>

      {disabledReason && !running ? (
        <p className="text-xs text-fg-faint">{disabledReason}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}

      {running ? (
        <ol className="flex flex-col gap-1.5 pt-1">
          {PHASE_STEPS.map((step, index) => {
            const state =
              index < currentPhaseIndex ? "done" : index === currentPhaseIndex ? "active" : "todo";
            return (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    state === "done" ? "bg-good" : state === "active" ? "bg-accent" : "bg-line-strong"
                  }`}
                />
                <span
                  className={
                    state === "todo" ? "text-fg-faint" : state === "active" ? "text-fg" : "text-fg-soft"
                  }
                >
                  {step.label}
                  {state === "active" ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {job?.status === "failed" ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-sm text-bad">{job.errorMessage ?? "The analysis failed."}</p>
          {job.retryable ? (
            <div>
              <Button size="sm" variant="secondary" onClick={() => void run(true)}>
                Retry
              </Button>
            </div>
          ) : (
            <p className="text-xs text-fg-faint">Adjust the clip window and try again.</p>
          )}
        </div>
      ) : null}

      {job?.status === "completed" && job.result ? (
        <AiResultPanel
          job={job}
          target={target}
          onSeekSeconds={onSeekSeconds}
          applied={applied}
          onApply={(replaceExisting) => {
            if (job.formDraft) {
              onApplyDraft(job.formDraft, replaceExisting);
              onSeekSeconds(job.clip.decisionSeconds);
              setApplied(true);
            }
          }}
          onRegenerate={() => void run(true)}
          onDiscard={() => {
            setJob(null);
            setApplied(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AiResultPanel({
  job,
  target,
  applied,
  onSeekSeconds,
  onApply,
  onRegenerate,
  onDiscard,
}: {
  job: AiRepDraftView;
  target: { jerseyNumber: string; teamColor: string };
  applied: boolean;
  onSeekSeconds: (seconds: number) => void;
  onApply: (replaceExisting: boolean) => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const result = job.result!;
  const meta = job.metadata;
  const pct = (n: number | undefined) => (n === undefined ? "—" : `${Math.round(n * 100)}%`);

  const notVisible = result.targetPlayerVisible === false;

  return (
    <div className="flex flex-col gap-3 rounded-control border border-line bg-raised p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-fg">AI draft — review required</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {meta?.model ? <Chip tone="quiet">{meta.model}</Chip> : null}
          {meta?.modelFallbackUsed ? <Chip tone="bad">fallback model</Chip> : null}
          <Chip tone={job.usable ? "neutral" : "bad"}>conf {pct(result.confidence)}</Chip>
          <Chip tone={result.targetPlayerVisible ? "neutral" : "bad"}>
            id {pct(result.targetIdentificationConfidence)}
          </Chip>
        </div>
      </div>

      {notVisible ? (
        <p className="text-sm text-bad">
          We couldn&apos;t reliably identify {target.teamColor.toLowerCase()} #{target.jerseyNumber} in
          this clip. Choose a moment where the jersey number or player is clearer.
        </p>
      ) : null}

      {job.gateReasons && job.gateReasons.length > 0 && !notVisible ? (
        <ul className="flex flex-col gap-1 text-xs text-fg-soft">
          {job.gateReasons.map((reason, i) => (
            <li key={i}>• {reason}</li>
          ))}
        </ul>
      ) : null}

      {!notVisible && result.situationSummary ? (
        <div className="text-sm leading-relaxed text-fg-soft">
          <span className="label-caps mr-2 text-fg-faint">Situation</span>
          {result.situationSummary}
        </div>
      ) : null}

      {!notVisible && result.visibleEvidence.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="label-caps text-fg-faint">Visible evidence</p>
          <ul className="flex flex-col gap-1">
            {result.visibleEvidence.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => onSeekSeconds(item.timestampSeconds)}
                  className="timecode shrink-0 rounded-xs text-accent underline-offset-4 hover:underline"
                  title="Seek the player here"
                >
                  {formatTimecode(item.timestampSeconds * 1000)}
                </button>
                <span className="text-fg-soft">{item.observation}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!notVisible && result.inferences.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="label-caps text-fg-faint">Inferences (not directly seen)</p>
          <ul className="flex flex-col gap-1 text-sm text-fg-soft">
            {result.inferences.map((inf, i) => (
              <li key={i}>
                <span className="timecode mr-2 text-fg-faint">{pct(inf.confidence)}</span>
                {inf.statement}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {job.warnings && job.warnings.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="label-caps text-bad">Warnings</p>
          <ul className="flex flex-col gap-1 text-sm text-fg-soft">
            {job.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.whatRemainsUncertain.length > 0 && !notVisible ? (
        <div className="flex flex-col gap-1.5">
          <p className="label-caps text-fg-faint">Uncertain</p>
          <ul className="flex flex-col gap-1 text-sm text-fg-faint">
            {result.whatRemainsUncertain.map((u, i) => (
              <li key={i}>• {u}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {meta ? (
        <p className="timecode text-fg-faint">
          {meta.frameCount ?? "—"} frames · {meta.latencyMs != null ? `${(meta.latencyMs / 1000).toFixed(1)}s` : "—"} ·{" "}
          {meta.totalTokens ?? "—"} tokens ·{" "}
          {meta.estimatedCostUsd != null ? `~$${meta.estimatedCostUsd.toFixed(4)}` : "cost n/a"} (estimate) ·{" "}
          {meta.promptVersion}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {job.applyAllowed && job.formDraft ? (
          <>
            <Button size="sm" onClick={() => onApply(false)} disabled={applied}>
              {applied ? "Applied" : "Apply to empty fields"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onApply(true)} disabled={applied}>
              Replace all
            </Button>
          </>
        ) : (
          <Button size="sm" disabled title="Confidence too low to auto-fill the form">
            Apply draft
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onRegenerate}>
          Regenerate
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>

      {applied ? (
        <p className="text-xs text-good">
          Applied to the form. Fields from the AI are marked · every field is editable — review before you
          publish.
        </p>
      ) : null}
    </div>
  );
}
