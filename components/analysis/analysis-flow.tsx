"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SectionLabel } from "@/components/ui/panel";
import {
  getGameAnalysisJob,
  retryGameAnalysis,
  startGameAnalysis,
  type GameAnalysisView,
} from "@/lib/actions/game-analysis";

const TEAM_COLORS = ["White", "Black", "Red", "Blue", "Green", "Gold", "Grey"];

const STAGES: { key: GameAnalysisView["stage"][]; label: string }[] = [
  { key: ["queued", "preparing"], label: "Preparing the game" },
  { key: ["locating-player"], label: "Finding your player" },
  { key: ["reviewing-possessions"], label: "Reviewing possessions" },
  { key: ["finding-decisions"], label: "Finding decision moments" },
  { key: ["building-reps", "ranking"], label: "Building your reps" },
  { key: ["done"], label: "Ready for review" },
];

type Frame = { timestampSeconds: number; url: string };

export function AnalysisFlow({
  gameId,
  defaults,
  frames,
  initialJob,
  profileComplete,
}: {
  gameId: string;
  defaults: { jerseyNumber: string; teamColor: string; marker: string | null };
  frames: Frame[];
  initialJob: GameAnalysisView | null;
  profileComplete: boolean;
}) {
  const [job, setJob] = useState<GameAnalysisView | null>(initialJob);
  const [jersey, setJersey] = useState(defaults.jerseyNumber);
  const [teamColor, setTeamColor] = useState(
    TEAM_COLORS.find((c) => c.toLowerCase() === defaults.teamColor.toLowerCase()) ?? "White",
  );
  const [marker, setMarker] = useState(defaults.marker ?? "");
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
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

  async function start() {
    setBusy(true);
    setError(null);
    const result = await startGameAnalysis({
      gameId,
      jerseyNumber: jersey.trim(),
      teamColor,
      marker: marker.trim() || undefined,
      confirmedFrameSeconds: [...confirmed],
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJob(result.data);
  }

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

  // --- not started: confirm the player ------------------------------
  const canStart = jersey.trim().length > 0 && confirmed.size > 0 && !busy;
  return (
    <div className="flex flex-col gap-8">
      {!profileComplete ? (
        <div className="rounded-panel border border-line bg-raised px-4 py-3.5 text-sm leading-relaxed text-fg-soft">
          Your{" "}
          <Link href={`/settings?next=${encodeURIComponent(`/games/${gameId}/analysis`)}`} className="underline underline-offset-4">
            coaching profile
          </Link>{" "}
          isn&rsquo;t complete yet. Analysis still runs on neutral principles without it.
        </div>
      ) : null}

      <section className="flex flex-col gap-5">
        <SectionLabel>Which player?</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jersey number">
            <input
              className={inputClass}
              value={jersey}
              inputMode="numeric"
              maxLength={3}
              onChange={(e) => setJersey(e.target.value)}
            />
          </Field>
          <Field label="Team color">
            <select className={inputClass} value={teamColor} onChange={(e) => setTeamColor(e.target.value)}>
              {TEAM_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Anything else that identifies them" hint="Optional — sleeves, headband, build">
          <input className={inputClass} value={marker} maxLength={80} onChange={(e) => setMarker(e.target.value)} />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Confirm it&rsquo;s the right player</SectionLabel>
        <p className="max-w-prose text-sm text-fg-soft">
          Tap the frames where you can see {teamColor.toLowerCase()} #{jersey || "—"}. We use these as
          a reference so the analysis follows the right player.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {frames.map((frame) => {
            const on = confirmed.has(frame.timestampSeconds);
            return (
              <button
                key={frame.timestampSeconds}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setConfirmed((prev) => {
                    const next = new Set(prev);
                    if (next.has(frame.timestampSeconds)) next.delete(frame.timestampSeconds);
                    else next.add(frame.timestampSeconds);
                    return next;
                  })
                }
                className={`overflow-hidden rounded-panel border-2 transition-[border-color] ${
                  on ? "border-accent" : "border-line hover:border-fg-faint"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.url}
                  alt={`Frame at ${Math.floor(frame.timestampSeconds / 60)}:${String(
                    Math.round(frame.timestampSeconds % 60),
                  ).padStart(2, "0")}`}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
        {frames.length === 0 ? (
          <p className="text-sm text-fg-faint">No preview frames available — you can still run the analysis.</p>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void start()} disabled={!canStart} size="lg">
          {busy ? "Starting…" : "Analyze game"}
        </Button>
        <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
          Build reps manually instead
        </ButtonLink>
      </div>
    </div>
  );
}
