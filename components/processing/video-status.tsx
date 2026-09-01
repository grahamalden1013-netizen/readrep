"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { pollGameVideo, type VideoStatusView } from "@/lib/actions/upload";
import type { VideoAssetStatus } from "@/lib/reps/schema";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150;

/** The pipeline a real upload actually walks, in order. */
const STAGES: { status: VideoAssetStatus; label: string }[] = [
  { status: "awaiting-upload", label: "Preparing upload" },
  { status: "uploading", label: "Transferring your film" },
  { status: "processing", label: "Video host is transcoding" },
  { status: "ready", label: "Ready to mark up" },
];

const TERMINAL: VideoAssetStatus[] = ["ready", "errored", "cancelled"];

function stageIndex(status: VideoAssetStatus): number {
  const index = STAGES.findIndex((stage) => stage.status === status);
  return index === -1 ? 0 : index;
}

/**
 * Reports the real state of the hosted asset.
 *
 * This polls rather than trusting webhooks alone: a webhook can be late,
 * dropped, or simply not configured, and the player must never be stranded on
 * a processing screen waiting for one.
 */
export function VideoStatus({
  gameId,
  initial,
  hasReps,
}: {
  gameId: string;
  initial: VideoStatusView;
  hasReps: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<VideoStatusView>(initial);
  const [pollError, setPollError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const pollsRef = useRef(0);

  const check = useCallback(async () => {
    const result = await pollGameVideo(gameId);
    if (!result.ok) {
      setPollError(result.error);
      return true;
    }
    setPollError(null);
    setStatus(result.data);
    return TERMINAL.includes(result.data.status);
  }, [gameId]);

  useEffect(() => {
    if (TERMINAL.includes(status.status)) return;

    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        if (cancelled) return;
        pollsRef.current += 1;
        if (pollsRef.current > MAX_POLLS) {
          setGaveUp(true);
          clearInterval(timer);
          return;
        }
        const done = await check();
        if (done && !cancelled) {
          clearInterval(timer);
          router.refresh();
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [check, router, status.status]);

  const current = stageIndex(status.status);
  const failed = status.status === "errored" || status.status === "cancelled";

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex flex-col gap-3" aria-live="polite">
        {STAGES.map((stage, index) => {
          const state = failed
            ? index < current
              ? "done"
              : "waiting"
            : index < current
              ? "done"
              : index === current
                ? "active"
                : "waiting";
          return (
            <li key={stage.status} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  state === "done"
                    ? "bg-accent"
                    : state === "active"
                      ? "animate-pulse bg-fg"
                      : "bg-raised"
                }`}
              />
              <span
                className={`text-sm ${
                  state === "waiting"
                    ? "text-fg-faint"
                    : state === "active"
                      ? "text-fg"
                      : "text-fg-soft"
                }`}
              >
                {stage.label}
              </span>
              {state === "done" ? (
                <span className="label-caps ml-auto text-fg-faint">Done</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="h-0.5 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round((current / (STAGES.length - 1)) * 100)}%` }}
        />
      </div>

      {status.provider === "fixture" ? (
        <p className="text-sm leading-relaxed text-fg-faint">
          Fixture mode: these stages report a simulated asset, not a real transcode. The game will
          play the committed demo film.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-fg-faint">
          Status comes straight from the video host. Once the film is ready, pick a player and
          NextRep finds the decisions worth replaying.
        </p>
      )}

      {failed ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-bad">
            {status.status === "cancelled"
              ? "This upload was cancelled."
              : (status.error ?? "The video host could not process this file.")}
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/games/new">Try another file</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {gaveUp ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-fg-soft">
            This is taking longer than expected. Nothing is lost — check back from your dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                pollsRef.current = 0;
                setGaveUp(false);
                void check();
              }}
            >
              Keep checking
            </Button>
            <ButtonLink href="/dashboard" variant="ghost">
              Back to dashboard
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {pollError ? <p className="text-sm text-fg-faint">{pollError}</p> : null}

      {status.status === "ready" ? (
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/games/${gameId}/analysis`} size="lg">
            {hasReps ? "Analyze another player" : "Analyze game"}
          </ButtonLink>
          <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
            Build reps manually
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
