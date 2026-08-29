"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RepVideo, type RepVideoHandle } from "./rep-video";
import { RevealPanel } from "./reveal-panel";
import { SKILL_CATEGORY_LABELS, type VideoSource } from "@/lib/reps/schema";
import type { PublicRep, RepReveal } from "@/lib/reps/public-rep";
import { answerRep, completeSession } from "@/lib/actions/session";

type Phase = "idle" | "watching" | "deciding" | "resuming" | "reveal";

const CHOICE_KEYS = ["1", "2", "3", "4"];

export function RepSession({
  sessionId,
  gameTitle,
  source,
  reps,
  initialReveals,
  initialIndex,
  initialPhase,
}: {
  sessionId: string;
  gameTitle: string;
  source: VideoSource;
  reps: PublicRep[];
  initialReveals: Record<string, RepReveal>;
  initialIndex: number;
  initialPhase: "idle" | "reveal";
}) {
  const router = useRouter();
  const videoRef = useRef<RepVideoHandle>(null);

  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [reveals, setReveals] =
    useState<Record<string, RepReveal>>(initialReveals);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

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

      const result = await answerRep({ sessionId, repId: rep.id, choiceId });
      setPending(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setReveals((current) => ({ ...current, [rep.id]: result.data }));
      setPhase("resuming");
      await videoRef.current?.resume();
    },
    [phase, pending, rep.id, sessionId],
  );

  const goNext = useCallback(async () => {
    if (isLastRep) {
      setIsFinishing(true);
      const result = await completeSession(sessionId);
      if (!result.ok) {
        setIsFinishing(false);
        setError(result.error);
        return;
      }
      router.push(`/sessions/${sessionId}/complete`);
      return;
    }
    await startRep(index + 1);
  }, [index, isLastRep, router, sessionId, startRep]);

  // Number keys pick a choice; Enter/Space advances the reveal.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName))
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="label-caps text-ink-100">
            Rep {index + 1} of {reps.length}
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            {reps.map((item, itemIndex) => (
              <span
                key={item.id}
                className={`h-1 w-6 rounded-full ${
                  itemIndex < index || reveals[item.id]
                    ? "bg-lime-accent"
                    : itemIndex === index
                      ? "bg-ink-300"
                      : "bg-ink-700"
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-500">{gameTitle}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <div className="overflow-hidden rounded-panel border border-ink-700 bg-ink-900 lg:col-span-2">
          <div className="relative">
            <RepVideo
              ref={videoRef}
              source={source}
              stopAtMs={stopAtMs}
              onReachedStop={handleReachedStop}
              onError={() => setVideoFailed(true)}
              captionsOn={captionsOn}
            />

            {phase === "idle" && !videoFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/70">
                <p className="text-sm text-ink-300">{rep.situation}</p>
                <Button size="lg" onClick={() => void startRep(index)}>
                  Start rep {index + 1}
                </Button>
              </div>
            ) : null}

            {videoFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/90 px-6 text-center">
                <p className="text-sm font-medium text-ink-100">
                  The film could not be loaded.
                </p>
                <p className="max-w-sm text-sm text-ink-400">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 px-4 py-3">
            <span className="label-caps rounded-sm bg-lime-accent px-2 py-1 text-ink-950">
              {SKILL_CATEGORY_LABELS[rep.category]}
            </span>
            <div className="flex items-center gap-2">
              {phase === "deciding" ? (
                <Button
                  variant="ghost"
                  onClick={() =>
                    void videoRef.current
                      ?.playFrom(rep.clipStartMs)
                      .then(() => setPhase("watching"))
                  }
                >
                  Replay clip
                </Button>
              ) : null}
              <Button
                variant="ghost"
                aria-pressed={captionsOn}
                onClick={() => setCaptionsOn((on) => !on)}
              >
                Captions {captionsOn ? "on" : "off"}
              </Button>
            </div>
          </div>
        </div>

        {/* Reserved height keeps the layout from jumping as the panel swaps. */}
        <div className="lg:min-h-[20rem]">
          {phase === "watching" || phase === "idle" ? (
            <p className="text-sm leading-relaxed text-ink-400">
              {rep.situation}
            </p>
          ) : null}

          {phase === "deciding" ? (
            <div className="flex flex-col gap-4">
              <h1 className="text-lg leading-snug font-medium text-ink-50 sm:text-xl">
                {rep.prompt}
              </h1>
              <ul className="flex flex-col gap-2">
                {rep.choices.map((choice, choiceIndex) => (
                  <li key={choice.id}>
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() => void choose(choice.id)}
                      className="flex w-full items-center gap-3 rounded-panel border border-ink-600 px-4 py-3 text-left text-sm text-ink-100 transition-colors hover:border-lime-accent hover:bg-ink-850 disabled:opacity-50"
                    >
                      <span className="font-mono text-xs text-ink-500">
                        {String.fromCharCode(65 + choiceIndex)}
                      </span>
                      {choice.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hidden text-xs text-ink-600 sm:block">
                Press {CHOICE_KEYS.slice(0, rep.choices.length).join("–")} to
                choose.
              </p>
            </div>
          ) : null}

          {phase === "resuming" ? (
            <p className="text-sm text-ink-400">
              Watching what actually happened…
            </p>
          ) : null}

          {phase === "reveal" && reveal ? (
            <RevealPanel
              rep={rep}
              reveal={reveal}
              isLastRep={isLastRep}
              isFinishing={isFinishing}
              onNext={() => void goNext()}
            />
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-signal-bad">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
