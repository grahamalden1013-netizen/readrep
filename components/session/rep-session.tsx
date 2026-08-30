"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { RepPlayer } from "./rep-player";
import type { VideoSource } from "@/lib/reps/schema";
import type { PublicRep, RepReveal } from "@/lib/reps/public-rep";
import { answerRep, completeSession } from "@/lib/actions/session";

/** Wires the rep loop to the server: answers are recorded, results persist. */
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
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const onAnswer = useCallback(
    async (repId: string, choiceId: string) => {
      const result = await answerRep({ sessionId, repId, choiceId });
      return result.ok
        ? ({ ok: true, reveal: result.data } as const)
        : ({ ok: false, error: result.error } as const);
    },
    [sessionId],
  );

  const onFinish = useCallback(async () => {
    setIsFinishing(true);
    const result = await completeSession(sessionId);
    if (!result.ok) {
      setIsFinishing(false);
      setFinishError(result.error);
      return;
    }
    router.push(`/sessions/${sessionId}/complete`);
  }, [router, sessionId]);

  /*
   * `my-auto` rather than `justify-center`: the film room centres itself when
   * there is room and behaves like a normal block when the reveal makes the
   * content taller than the viewport, so the top never becomes unreachable.
   */
  return (
    <div className="page-shell flex flex-1 flex-col py-6 sm:py-8">
      <div className="my-auto flex w-full flex-col gap-5">
        <RepPlayer
          gameTitle={gameTitle}
          source={source}
          reps={reps}
          initialReveals={initialReveals}
          initialIndex={initialIndex}
          initialPhase={initialPhase}
          onAnswer={onAnswer}
          onFinish={onFinish}
          titleAs="h1"
          finishLabel="See results"
          isFinishing={isFinishing}
        />
        {finishError ? (
          <p role="alert" className="text-sm text-bad">
            {finishError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
