"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Check, CheckCircle2, Play, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { SessionClipDetail } from "@/lib/sessions/session-detail";
import { submitPrediction } from "./actions";

const LEAD_IN_MS = 8000;
const REVEAL_TAIL_MS = 6000;

type Phase = "watching" | "deciding" | "revealed";

type Reveal = {
  selectedOption: string;
  isCorrect: boolean;
  correctOption: string;
  feedback: string;
};

export function SessionRunner({
  sessionId,
  clips,
  initialIndex,
}: {
  sessionId: string;
  clips: SessionClipDetail[];
  initialIndex: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<Phase>("watching");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [results, setResults] = useState<Map<string, boolean>>(
    () => new Map(clips.filter((c) => c.answered).map((c) => [c.clipId, c.answered!.isCorrect])),
  );
  const [error, setError] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);

  const clip = clips[index];
  const done = index >= clips.length;
  const decisionSec = clip ? clip.decisionTimestampMs / 1000 : 0;

  useEffect(() => {
    if (!clip || phase !== "watching") return;
    const video = videoRef.current;
    if (!video || videoFailed) return;

    const startSec = Math.max(0, (clip.decisionTimestampMs - LEAD_IN_MS) / 1000);
    video.currentTime = startSec;
    void video.play().catch(() => {
      // Autoplay blocked — the player can press play; the pause guard below
      // still fires at the decision point.
    });

    const onTimeUpdate = () => {
      if (video.currentTime >= decisionSec) {
        video.pause();
        setPhase("deciding");
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [clip, phase, decisionSec, videoFailed]);

  function answer(option: string) {
    if (!clip) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPrediction(sessionId, clip.clipId, option);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setResults((prev) => new Map(prev).set(clip.clipId, result.isCorrect));
      setReveal({
        selectedOption: option,
        isCorrect: result.isCorrect,
        correctOption: result.correctOption,
        feedback: result.feedback,
      });
      setPhase("revealed");

      const video = videoRef.current;
      if (video && !videoFailed) {
        void video.play().catch(() => {});
        const stopAt = (clip.decisionTimestampMs + REVEAL_TAIL_MS) / 1000;
        const onTimeUpdate = () => {
          if (video.currentTime >= stopAt) {
            video.pause();
            video.removeEventListener("timeupdate", onTimeUpdate);
          }
        };
        video.addEventListener("timeupdate", onTimeUpdate);
      }
    });
  }

  function next() {
    setReveal(null);
    setPhase("watching");
    setIndex((i) => i + 1);
  }

  if (done || !clip) {
    const correct = [...results.values()].filter(Boolean).length;

    return (
      <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface px-6 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground">
            Session complete
          </h2>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            You read {correct} of {clips.length} {clips.length === 1 ? "moment" : "moments"}{" "}
            correctly.
          </p>
        </div>
        <LinkButton href="/dashboard" variant="secondary">
          Back to home
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">
          Read {index + 1} of {clips.length}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {clips.map((c, i) => (
            <span
              key={c.clipId}
              className={cn(
                "h-1 w-5 rounded-full",
                i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-surface-3",
              )}
            />
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border-strong bg-black">
        {videoFailed ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-[14px] font-medium text-foreground">Film couldn&apos;t load</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              You can still make your read from the prompt below.
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={clip.videoUrl}
            className="aspect-video w-full"
            playsInline
            onError={() => setVideoFailed(true)}
          />
        )}

        {phase === "deciding" && !videoFailed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-4 pt-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary-soft-foreground">
              Decision point
            </span>
          </div>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {phase === "watching" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
          <Play className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[13.5px] text-muted-foreground">
            Watch the play. It&apos;ll pause right before the decision.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => {
              videoRef.current?.pause();
              setPhase("deciding");
            }}
          >
            Skip ahead
          </Button>
        </div>
      )}

      {phase === "deciding" && (
        <div className="rr-animate-in flex flex-col gap-3.5">
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            {clip.prompt}
          </h2>
          <div className="flex flex-col gap-2">
            {clip.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => answer(option)}
                className="rounded-lg border border-border-strong bg-surface px-4 py-3.5 text-left text-[14.5px] font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:border-primary/50 hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "revealed" && reveal && (
        <div className="rr-animate-in flex flex-col gap-3">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-4 py-3",
              reveal.isCorrect
                ? "border-success/30 bg-success-soft"
                : "border-border-strong bg-surface",
            )}
          >
            {reveal.isCorrect ? (
              <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <X className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="text-[13.5px]">
              <p className={reveal.isCorrect ? "font-medium text-success-soft-foreground" : "font-medium text-foreground"}>
                {reveal.isCorrect ? "Good read" : "Not this time"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                You chose <span className="text-foreground">{reveal.selectedOption}</span>
                {!reveal.isCorrect && (
                  <>
                    {" — the play was "}
                    <span className="text-foreground">{reveal.correctOption}</span>
                  </>
                )}
                .
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary-soft/50 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-soft-foreground">
              Coach&apos;s take
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-foreground">{reveal.feedback}</p>
          </div>

          <Button onClick={next} size="lg" className="self-start">
            {index + 1 < clips.length ? (
              <>
                Next read
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            ) : (
              "Finish session"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
