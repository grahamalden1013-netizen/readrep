"use client";

import { Button } from "@/components/ui/button";
import type { PublicRep, RepReveal } from "@/lib/reps/public-rep";

function labelFor(rep: PublicRep, choiceId: string) {
  return rep.choices.find((choice) => choice.id === choiceId)?.label ?? "—";
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color =
    tone === "good" ? "text-signal-good" : tone === "bad" ? "text-signal-bad" : "text-ink-100";
  return (
    <div className="flex flex-col gap-1 border-t border-ink-800 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:gap-4">
      <p className="label-caps w-40 shrink-0 pt-0.5 text-ink-500">{label}</p>
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
}: {
  rep: PublicRep;
  reveal: RepReveal;
  isLastRep: boolean;
  isFinishing: boolean;
  onNext: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-panel border border-ink-700 bg-ink-900 p-5"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span
          className={`label-caps rounded-sm px-2 py-1 ${
            reveal.isCorrect ? "bg-signal-good text-ink-950" : "bg-signal-bad text-ink-950"
          }`}
        >
          {reveal.isCorrect ? "Correct read" : "Missed read"}
        </span>
        <p className="text-sm text-ink-400">{rep.title}</p>
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

      <p className="text-sm leading-relaxed text-ink-300">{reveal.explanation}</p>

      <p className="border-l-2 border-lime-accent pl-3 text-sm font-medium text-ink-50">
        {reveal.coachingCue}
      </p>

      <div>
        <Button onClick={onNext} disabled={isFinishing} size="lg">
          {isLastRep ? (isFinishing ? "Finishing…" : "See results") : "Next rep"}
        </Button>
      </div>
    </div>
  );
}
