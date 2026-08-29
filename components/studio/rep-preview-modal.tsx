"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RepPlayer } from "@/components/session/rep-player";
import { toPublicRep, toReveal } from "@/lib/reps/public-rep";
import type { Rep, VideoSource } from "@/lib/reps/schema";

/**
 * Runs the real `RepPlayer` against the unsaved draft, so a reviewer sees the
 * player's experience rather than a mock of it. Nothing is persisted: the
 * reveal is computed locally from the draft the reviewer is holding.
 */
export function RepPreviewModal({
  rep,
  gameTitle,
  source,
  onClose,
}: {
  rep: Rep;
  gameTitle: string;
  source: VideoSource;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const onAnswer = useCallback(
    async (_repId: string, choiceId: string) => ({ ok: true as const, reveal: toReveal(rep, choiceId) }),
    [rep],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rep preview"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-950/95 p-4 sm:p-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-caps text-lime-accent">Preview</p>
            <p className="mt-1 text-sm text-ink-400">
              Exactly what a player sees. Nothing is recorded.
            </p>
          </div>
          <Button ref={closeRef} variant="secondary" onClick={onClose}>
            Close preview
          </Button>
        </div>

        <RepPlayer
          gameTitle={gameTitle}
          source={source}
          reps={[toPublicRep(rep)]}
          initialReveals={{}}
          initialIndex={0}
          initialPhase="idle"
          onAnswer={onAnswer}
          onFinish={onClose}
          finishLabel="Close preview"
        />
      </div>
    </div>
  );
}
