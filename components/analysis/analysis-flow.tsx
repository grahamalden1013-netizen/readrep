"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { PlayerConfirm } from "./player-confirm";
import {
  getGameAnalysisJob,
  retryGameAnalysis,
  type GameAnalysisView,
} from "@/lib/actions/game-analysis";

const STAGES: { key: GameAnalysisView["stage"][]; label: string }[] = [
  { key: ["queued", "preparing"], label: "Preparing the game" },
  { key: ["locating-player"], label: "Finding your player" },
  { key: ["reviewing-possessions"], label: "Reviewing possessions" },
  { key: ["finding-decisions"], label: "Finding decision moments" },
  { key: ["building-reps", "ranking"], label: "Building your reps" },
  { key: ["done"], label: "Ready for review" },
];

export function AnalysisFlow({
  gameId,
  defaults,
  initialJob,
  profileComplete,
}: {
  gameId: string;
  defaults: { jerseyNumber: string; teamColor: string; marker: string | null };
  initialJob: GameAnalysisView | null;
  profileComplete: boolean;
}) {
  const [job, setJob] = useState<GameAnalysisView | null>(initialJob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = job?.status === "queued" || job?.status === "running";

  const poll = useCallback(async () => {
    if (!job) return;
    const result = await getGameAnalysisJob(job.jobId);
    if (result.ok) setJob(result.data);
  }, [job]);

  useEffect(() => {
    if (!active) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => void poll(), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [active, poll]);

  async function retry() {
    if (!job) return;
    setBusy(true);
    const result = await retryGameAnalysis(job.jobId);
    setBusy(false);
    if (result.ok) setJob(result.data);
    else setError(result.error);
  }

  // --- completed -------------------------------------------------------
  if (job && job.status === "completed") {
    return (
      <div className="flex flex-col gap-5">
        <p className="display-2 text-fg">
          {job.candidateCount > 0
            ? `We found ${job.candidateCount} ${job.candidateCount === 1 ? "moment" : "moments"} worth replaying.`
            : `We couldn't confidently find decisions for ${job.target.teamColor} #${job.target.jerseyNumber} in this game.`}
        </p>
        {job.candidateCount > 0 ? (
          <>
            <p className="max-w-prose text-sm leading-relaxed text-fg-soft">
              Review each one, keep the useful ones, and start a session for your player.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/games/${gameId}/review`} size="lg">
                Review moments
              </ButtonLink>
              <Button variant="ghost" onClick={() => void retry()} disabled={busy}>
                Run again
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void retry()} disabled={busy}>
              Try again
            </Button>
            <ButtonLink href={`/games/${gameId}/advanced`} variant="secondary">
              Add a moment manually
            </ButtonLink>
          </div>
        )}
        {error ? <p role="alert" className="text-sm text-bad">{error}</p> : null}
      </div>
    );
  }

  // --- failed / cancelled -------------------------------------------
  if (job && (job.status === "failed" || job.status === "cancelled")) {
    return (
      <div className="flex flex-col gap-4">
        <p className="display-3 text-fg">We hit a snag.</p>
        <p className="max-w-prose text-sm text-fg-soft">{job.errorMessage}</p>
        <div className="flex gap-3">
          <Button onClick={() => void retry()} disabled={busy}>
            Try again
          </Button>
          <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
            Add a moment manually
          </ButtonLink>
        </div>
      </div>
    );
  }

  // --- running --------------------------------------------------------
  if (active && job) {
    const activeIndex = STAGES.findIndex((s) => s.key.includes(job.stage));
    return (
      <div className="flex flex-col gap-8">
        <ol className="flex flex-col gap-3" aria-live="polite">
          {STAGES.map((stage, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "waiting";
            return (
              <li key={stage.label} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    state === "done" ? "bg-accent" : state === "active" ? "animate-pulse bg-fg" : "bg-raised"
                  }`}
                />
                <span
                  className={`text-sm ${
                    state === "waiting" ? "text-fg-faint" : state === "active" ? "text-fg" : "text-fg-soft"
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="max-w-prose text-sm leading-relaxed text-fg-faint">
          This takes a few minutes. You can leave this page — we&rsquo;ll keep working, and it&rsquo;ll be
          here when you come back.
        </p>
        <div>
          <ButtonLink href="/dashboard" variant="ghost">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    );
  }

  // --- not started: confirm the player -----------------------------
  return (
    <div className="flex flex-col gap-8">
      {!profileComplete ? (
        <div className="rounded-panel border border-line bg-raised px-4 py-3.5 text-sm leading-relaxed text-fg-soft">
          Your{" "}
          <a
            href={`/settings?next=${encodeURIComponent(`/games/${gameId}/analysis`)}`}
            className="underline underline-offset-4"
          >
            coaching profile
          </a>{" "}
          isn&rsquo;t complete yet. Analysis still runs on neutral principles without it.
        </div>
      ) : null}

      <PlayerConfirm gameId={gameId} target={defaults} onStarted={setJob} />
    </div>
  );
}
