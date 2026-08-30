"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startSessionForGame } from "@/lib/actions/session";

export type Stage = { id: string; label: string; durationMs: number };

/**
 * Steps through the analysis stages, then creates the session. The stages are
 * timed presentation of work that is already done for a seeded game — the copy
 * says so — but the session it lands on is real, and a failure surfaces here
 * rather than leaving the player stuck watching a spinner.
 */
export function AnalysisProgress({
  gameId,
  stages,
  note,
}: {
  gameId: string;
  stages: Stage[];
  note: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    let elapsed = 0;
    stages.forEach((stage, index) => {
      elapsed += stage.durationMs;
      timers.push(
        setTimeout(() => {
          if (!cancelled) setCurrent(index + 1);
        }, elapsed),
      );
    });

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        void startSessionForGame(gameId).then((result) => {
          if (cancelled) return;
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.replace(`/sessions/${result.data.sessionId}`);
        });
      }, elapsed),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [gameId, router, stages]);

  const done = current >= stages.length;

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex flex-col gap-3" aria-live="polite">
        {stages.map((stage, index) => {
          const state = index < current ? "done" : index === current ? "active" : "waiting";
          return (
            <li key={stage.id} className="flex items-center gap-3">
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
                  state === "waiting" ? "text-fg-faint" : state === "active" ? "text-fg" : "text-fg-soft"
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
          style={{ width: `${Math.round((current / stages.length) * 100)}%` }}
        />
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-fg-faint">{note}</p>

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-bad">{error}</p>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      ) : null}

      {done && !error ? <p className="text-sm text-fg-soft">Opening your session…</p> : null}
    </div>
  );
}
