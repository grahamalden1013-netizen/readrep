"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  VideoSurface,
  type VideoSurfaceHandle,
} from "@/components/video/video-surface";
import { Chip } from "@/components/ui/chip";
import { FreezeMarks } from "@/components/video/freeze-marks";
import { RevealPanel } from "./reveal-panel";
import { SKILL_CATEGORY_LABELS, type VideoSource } from "@/lib/reps/schema";
import type { PublicRep, RepReveal } from "@/lib/reps/public-rep";

export type RepPhase = "idle" | "watching" | "deciding" | "resuming" | "reveal";

const CHOICE_KEYS = ["1", "2", "3", "4"];

export type AnswerHandler = (
  repId: string,
  choiceId: string,
) => Promise<{ ok: true; reveal: RepReveal } | { ok: false; error: string }>;

/**
 * The rep loop itself: play → pause on the decision → choose → resume → reveal.
 *
 * It owns no persistence. A real session hands it server actions; the studio
 * preview hands it local functions, so a reviewer sees exactly what a player
 * will see rather than an approximation of it.
 */
export function RepPlayer({
  gameTitle,
  source,
  reps,
  initialReveals,
  initialIndex,
  initialPhase,
  onAnswer,
  onFinish,
  finishLabel,
  isFinishing = false,
  onPhaseChange,
  titleAs: Title = "p",
  promptAs: Prompt = "h2",
}: {
  gameTitle: string;
  source: VideoSource;
  reps: PublicRep[];
  initialReveals: Record<string, RepReveal>;
  initialIndex: number;
  initialPhase: "idle" | "reveal";
  onAnswer: AnswerHandler;
  onFinish: () => void | Promise<void>;
  finishLabel: string;
  isFinishing?: boolean;
  /** Lets a host surface label the stage without owning any of the loop. */
  onPhaseChange?: (phase: RepPhase) => void;
  /**
   * The game title is the page heading in a session and a plain line when the
   * loop is embedded in a page that already owns its <h1>.
   */
  titleAs?: "h1" | "p";
  /** The prompt sits one level under whatever the host used for the title. */
  promptAs?: "h2" | "h3";
}) {
  const videoRef = useRef<VideoSurfaceHandle>(null);

  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<RepPhase>(initialPhase);
  const [reveals, setReveals] =
    useState<Record<string, RepReveal>>(initialReveals);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);

  // Held in a ref so a parent re-render cannot restart the notification effect.
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  });
  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  const rep = reps[index];
  const reveal = reveals[rep.id] ?? null;
  const isLastRep = index === reps.length - 1;

  const stopAtMs =
    phase === "watching"
      ? rep.decisionPauseMs
      : phase === "resuming"
        ? rep.clipEndMs
        : null;

  const startRep = useCallback(
    async (nextIndex: number) => {
      setIndex(nextIndex);
      setPhase("watching");
      setError(null);
      await videoRef.current?.playFrom(reps[nextIndex].clipStartMs);
    },
    [reps],
  );

  const handleReachedStop = useCallback(() => {
    setPhase((current) =>
      current === "watching"
        ? "deciding"
        : current === "resuming"
          ? "reveal"
          : current,
    );
  }, []);

  const choose = useCallback(
    async (choiceId: string) => {
      if (phase !== "deciding" || pending) return;
      setPending(choiceId);
      setError(null);

      const result = await onAnswer(rep.id, choiceId);
      setPending(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setReveals((current) => ({ ...current, [rep.id]: result.reveal }));
      setPhase("resuming");
      await videoRef.current?.resume();
    },
    [onAnswer, pending, phase, rep.id],
  );

  const goNext = useCallback(async () => {
    if (isLastRep) {
      await onFinish();
      return;
    }
    await startRep(index + 1);
  }, [index, isLastRep, onFinish, startRep]);

  // Number keys pick a choice; Enter/Space advances the reveal.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
      )
        return;

      if (phase === "deciding") {
        const slot = CHOICE_KEYS.indexOf(event.key);
        if (slot >= 0 && slot < rep.choices.length) {
          event.preventDefault();
          void choose(rep.choices[slot].id);
        }
        return;
      }

      if (phase === "reveal" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        void goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choose, goNext, phase, rep.choices]);

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-2.5">
        <Title className="display-3 text-fg">{gameTitle}</Title>
        {/* A single-rep run (the homepage proof, the studio preview) has no
            progress to report, so it does not pretend to. */}
        {reps.length > 1 ? (
          <div className="flex items-center gap-3">
            <p className="label-caps text-fg-faint">
              Rep {index + 1} of {reps.length}
            </p>
            <div className="flex gap-1.5" aria-hidden="true">
              {reps.map((item, itemIndex) => (
                <span
                  key={item.id}
                  className={`h-1 w-6 rounded-full ${
                    itemIndex < index || reveals[item.id]
                      ? "bg-accent"
                      : itemIndex === index
                        ? "bg-fg-faint"
                        : "bg-line-strong"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="overflow-hidden rounded-frame border border-line bg-surface">
          <div className="relative">
            <VideoSurface
              ref={videoRef}
              source={source}
              stopAtMs={stopAtMs}
              onReachedStop={handleReachedStop}
              onError={() => setVideoFailed(true)}
              captionsOn={captionsOn}
            />

            <FreezeMarks active={phase === "deciding"} />

            {phase === "idle" && !videoFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-canvas/70 px-6 text-center">
                <Button size="lg" onClick={() => void startRep(index)}>
                  Start rep {index + 1}
                </Button>
              </div>
            ) : null}

            {videoFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/90 px-6 text-center">
                <p className="display-3 text-fg">
                  The film could not be loaded.
                </p>
                <p className="max-w-sm text-sm text-fg-soft">
                  Check your connection and try again — your answers so far are
                  saved.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setVideoFailed(false);
                    setPhase("idle");
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Chip tone="accent">{SKILL_CATEGORY_LABELS[rep.category]}</Chip>
              <span className="label-caps whitespace-nowrap text-fg-faint">
                {phase === "deciding"
                  ? "Paused"
                  : phase === "resuming"
                    ? "Outcome"
                    : phase === "watching"
                      ? "Playing"
                      : phase === "reveal"
                        ? "Clip ended"
                        : "Ready"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {phase === "deciding" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void videoRef.current
                      ?.playFrom(rep.clipStartMs)
                      .then(() => setPhase("watching"))
                  }
                >
                  Replay clip
                </Button>
              ) : null}
              {source.captionsSrc ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={captionsOn}
                  onClick={() => setCaptionsOn((on) => !on)}
                >
                  Captions {captionsOn ? "on" : "off"}
                </Button>
              ) : null}
            </div>
          </div>

          {source.disclaimer ? (
            <p className="border-t border-line px-4 py-2.5 text-xs text-fg-faint">
              {source.disclaimer}
            </p>
          ) : null}
        </div>

        {/* Reserved height keeps the layout from jumping as the panel swaps. */}
        <div className="flex flex-col justify-center lg:min-h-[22rem]">
          {phase === "watching" || phase === "idle" ? (
            <p className="text-sm leading-relaxed text-fg-soft">
              {rep.situation}
            </p>
          ) : null}

          {phase === "deciding" ? (
            <div className="flex flex-col gap-4">
              <Prompt className="decision-mark text-lg leading-snug font-semibold text-fg sm:text-xl">
                {rep.prompt}
              </Prompt>
              <ul className="flex flex-col gap-2">
                {rep.choices.map((choice, choiceIndex) => (
                  <li key={choice.id}>
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() => void choose(choice.id)}
                      className="flex w-full items-start gap-3 rounded-control border border-line-strong bg-surface px-4 py-3 text-left text-sm text-fg transition-[border-color,background-color] duration-150 ease-signal hover:border-accent hover:bg-raised disabled:opacity-50"
                    >
                      <span className="timecode mt-0.5 text-fg-faint">
                        {String.fromCharCode(65 + choiceIndex)}
                      </span>
                      {choice.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hidden text-xs text-fg-faint sm:block">
                Press {CHOICE_KEYS.slice(0, rep.choices.length).join("\u2013")}{" "}
                to choose.
              </p>
            </div>
          ) : null}

          {phase === "resuming" ? (
            <p className="text-sm text-fg-soft">
              Watching what actually happened&hellip;
            </p>
          ) : null}

          {phase === "reveal" && reveal ? (
            <RevealPanel
              rep={rep}
              reveal={reveal}
              isLastRep={isLastRep}
              isFinishing={isFinishing}
              onNext={() => void goNext()}
              finishLabel={finishLabel}
            />
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-bad">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
