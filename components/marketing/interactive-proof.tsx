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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-graphite-950 uppercase sm:text-2xl">
            {STAGES.map((stage, index) => {
              const state = index < active ? "done" : index === active ? "active" : "pending";
              return (
                <span key={stage} className="flex items-center gap-2.5">
                  <span
                    className={`transition-[color] duration-300 ${
                      state === "active"
                        ? "text-court"
                        : state === "done"
                          ? "text-graphite-950"
                          : "text-graphite-500"
                    }`}
                  >
                    {stage}
                  </span>
                  {index < STAGES.length - 1 ? (
                    <span aria-hidden="true" className="text-rule-strong">
                      &rarr;
                    </span>
                  ) : null}
                </span>
              );
            })}
          </h2>
          <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-graphite-700">
            One real rep, start to finish. Make the call before the film shows you what happened.
          </p>
        </div>

        <ButtonLink href={demoHref} variant="outline">
          Skip to the full session
        </ButtonLink>
      </div>

      <div className="surface-dark accent-court rounded-[6px] border border-graphite-950/15 p-4 shadow-[0_18px_40px_-24px_rgba(22,19,15,0.45)] sm:p-5">
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
    </div>
  );
}
