"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { RepPlayer, type RepPhase } from "@/components/session/rep-player";
import { revealDemoRep } from "@/lib/actions/preview";
import type { VideoSource } from "@/lib/reps/schema";
import type { PublicRep } from "@/lib/reps/public-rep";

const STAGES = ["Watch", "Pause", "Decide", "Reveal"] as const;

/** Where the loop currently is. Pause is an instant, so it never sits "active". */
function stageIndex(phase: RepPhase): number {
  switch (phase) {
    case "watching":
      return 0;
    case "deciding":
      return 2;
    case "resuming":
    case "reveal":
      return 3;
    default:
      return -1;
  }
}

/**
 * The actual product, running on the homepage.
 *
 * This is `RepPlayer` — the same component the real session uses — wired to a
 * server action instead of a session. Nothing about the loop is reimplemented,
 * and the correct answer still only arrives in the response to a submitted
 * choice.
 *
 * It is rendered inside the film shell, so the visitor is already standing in
 * the product's own room before they ever click through to it.
 *
 * The section heading doubles as the progress indicator: the four stages light
 * up as the loop runs, so the page states them once rather than twice.
 */
export function InteractiveProof({
  rep,
  source,
  gameTitle,
  demoHref,
}: {
  rep: PublicRep;
  source: VideoSource;
  gameTitle: string;
  demoHref: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<RepPhase>("idle");

  const onAnswer = useCallback(async (repId: string, choiceId: string) => {
    const result = await revealDemoRep({ repId, choiceId });
    return result.ok
      ? ({ ok: true, reveal: result.data } as const)
      : ({ ok: false, error: result.error } as const);
  }, []);

  const onFinish = useCallback(() => {
    router.push(demoHref);
  }, [demoHref, router]);

  const active = stageIndex(phase);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2 className="display-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg">
            {STAGES.map((stage, index) => {
              const state = index < active ? "done" : index === active ? "active" : "pending";
              return (
                <span key={stage} className="flex items-center gap-3">
                  <span
                    className={`transition-[color] duration-300 ease-signal ${
                      state === "active"
                        ? "text-accent"
                        : state === "done"
                          ? "text-fg"
                          : "text-fg-faint"
                    }`}
                  >
                    {stage}
                  </span>
                  {index < STAGES.length - 1 ? (
                    <span aria-hidden="true" className="text-line-strong">
                      &rarr;
                    </span>
                  ) : null}
                </span>
              );
            })}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-soft">
            One real rep, start to finish. Make the call before the film shows you what happened.
          </p>
        </div>

        <ButtonLink href={demoHref} variant="secondary">
          Skip to the full session
        </ButtonLink>
      </div>

      <RepPlayer
        gameTitle={gameTitle}
        source={source}
        reps={[rep]}
        initialReveals={{}}
        initialIndex={0}
        initialPhase="idle"
        onAnswer={onAnswer}
        onFinish={onFinish}
        onPhaseChange={setPhase}
        promptAs="h3"
        finishLabel="Take the full session"
      />
    </div>
  );
}
