"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { PublicRep, RepReveal } from "@/lib/reps/public-rep";

function labelFor(rep: PublicRep, choiceId: string) {
  return rep.choices.find((choice) => choice.id === choiceId)?.label ?? "—";
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0">
      <p className="label-caps text-fg-faint">{label}</p>
      <p className={`text-sm leading-relaxed ${color}`}>{value}</p>
    </div>
  );
}

export function RevealPanel({
  rep,
  reveal,
  isLastRep,
  isFinishing,
  onNext,
  finishLabel = "See results",
}: {
  rep: PublicRep;
  reveal: RepReveal;
  isLastRep: boolean;
  isFinishing: boolean;
  onNext: () => void;
  finishLabel?: string;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={reveal.isCorrect ? "good" : "bad"}>
          {reveal.isCorrect ? "Correct read" : "Missed read"}
        </Chip>
        <p className="text-sm text-fg-faint">{rep.title}</p>
      </div>

      <div>
        <Row
          label="Your read"
          value={labelFor(rep, reveal.chosenChoiceId)}
          tone={reveal.isCorrect ? "good" : "bad"}
        />
        <Row
          label="What you did"
          value={`${labelFor(rep, reveal.actualChoiceId)} — ${reveal.actualOutcome}`}
        />
        <Row label="Best read" value={labelFor(rep, reveal.correctChoiceId)} tone="good" />
      </div>

      <p className="text-sm leading-relaxed text-fg-soft">{reveal.explanation}</p>

      <p className="decision-mark text-sm leading-relaxed font-medium text-fg">
        {reveal.coachingCue}
      </p>

      <div className="pt-1">
        <Button onClick={onNext} disabled={isFinishing} size="lg">
          {isLastRep ? (isFinishing ? "Finishing…" : finishLabel) : "Next rep"}
        </Button>
      </div>
    </div>
  );
}
