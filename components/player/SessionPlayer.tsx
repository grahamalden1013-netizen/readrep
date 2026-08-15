"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { completeSession, submitPrediction } from "@/app/(app)/sessions/[sessionId]/actions";
import type { AnsweredClip, PlayerClip } from "@/lib/sessions/queries";

type RevealData = {
  isCorrect: boolean;
  correctOption: string;
  feedback: string;
};

export function SessionPlayer({
  sessionId,
  videoUrl,
  clips,
  initialAnswered,
}: {
  sessionId: string;
  videoUrl: string;
  clips: PlayerClip[];
  initialAnswered: AnsweredClip[];
}) {
  const [answered, setAnswered] = useState<Map<string, AnsweredClip>>(
    () => new Map(initialAnswered.map((a) => [a.clip_id, a])),
  );
  const [activeClip, setActiveClip] = useState<PlayerClip | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const sortedClips = useMemo(
    () => [...clips].sort((a, b) => a.decision_timestamp_ms - b.decision_timestamp_ms),
    [clips],
  );

  const finish = useCallback(async () => {
    setIsDone(true);
    await completeSession(sessionId);
  }, [sessionId]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || activeClip) return;

    const currentMs = video.currentTime * 1000;
    const next = sortedClips.find(
      (clip) => !answered.has(clip.id) && currentMs >= clip.decision_timestamp_ms,
    );

    if (next) {
      video.pause();
      setActiveClip(next);
    }
  };

  const handleEnded = useCallback(() => {
    if (!isDone && answered.size >= sortedClips.length) {
      finish();
    }
  }, [answered.size, finish, isDone, sortedClips.length]);

  const choose = async (option: string) => {
    if (!activeClip || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitPrediction(sessionId, activeClip.id, option);
      setAnswered((prev) => {
        const next = new Map(prev);
        next.set(activeClip.id, {
          clip_id: activeClip.id,
          selected_option: option,
          is_correct: result.isCorrect,
        });
        return next;
      });
      setReveal(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueAfterReveal = async () => {
    const isLastClip = answered.size >= sortedClips.length;
    setActiveClip(null);
    setReveal(null);

    if (isLastClip) {
      await finish();
      return;
    }

    videoRef.current?.play();
  };

  if (isDone) {
    const correctCount = [...answered.values()].filter((a) => a.is_correct).length;
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Session complete</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {correctCount} / {sortedClips.length} correct
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <video
          ref={videoRef}
          src={videoUrl}
          controls={hasStarted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="w-full rounded bg-black"
        />
        {!hasStarted && (
          <button
            type="button"
            onClick={() => {
              setHasStarted(true);
              videoRef.current?.play();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-medium text-white"
          >
            ▶ Start session
          </button>
        )}
      </div>

      {activeClip && (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-lg font-medium">{activeClip.prompt}</p>

          {!reveal ? (
            <div className="flex flex-col gap-2">
              {activeClip.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => choose(option)}
                  className="rounded border border-zinc-300 px-4 py-2 text-left hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p
                className={
                  reveal.isCorrect
                    ? "font-medium text-green-700 dark:text-green-500"
                    : "font-medium text-red-700 dark:text-red-500"
                }
              >
                {reveal.isCorrect ? "Correct!" : `Not quite — correct answer: ${reveal.correctOption}`}
              </p>
              {reveal.feedback && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {reveal.feedback}
                </p>
              )}
              <button
                type="button"
                onClick={continueAfterReveal}
                className="self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
