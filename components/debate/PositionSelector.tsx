"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Debate, DebateFormat, Position } from "@/types/ngn";
import { Button, Eyebrow } from "@/components/ui/primitives";
import { FORMAT_LIST } from "@/lib/arena/formats";
import { track } from "@/lib/analytics";

/**
 * Position selection.
 *
 * "Assign me a side" is a first-class option rather than a fallback, and it is
 * described honestly — a student who picks it may be handed a position they
 * disagree with. That is the educational point, so it must not be a surprise.
 */

type Choice = Position | "assign";

const CHOICES: {
  id: Choice;
  label: string;
  body: string;
  tone: "support" | "oppose" | "undecided" | "accent";
}[] = [
  {
    id: "support",
    label: "Support",
    body: "You will argue in favour of the proposition.",
    tone: "support",
  },
  {
    id: "oppose",
    label: "Oppose",
    body: "You will argue against the proposition.",
    tone: "oppose",
  },
  {
    id: "undecided",
    label: "Undecided",
    body: "You have not made up your mind. You will still be given a side before round one.",
    tone: "undecided",
  },
  {
    id: "assign",
    label: "Assign me a side",
    body: "NGN picks. You may be given a position you do not personally agree with — arguing it anyway is how this gets easier.",
    tone: "accent",
  },
];

const TONE_STYLES = {
  support: { border: "var(--color-support)", bg: "var(--color-support-soft)", text: "var(--color-support)" },
  oppose: { border: "var(--color-oppose)", bg: "var(--color-oppose-soft)", text: "var(--color-oppose)" },
  undecided: { border: "var(--color-undecided)", bg: "var(--color-undecided-soft)", text: "var(--color-undecided)" },
  accent: { border: "var(--color-lime-deep)", bg: "var(--color-accent-soft)", text: "var(--color-accent)" },
} as const;

export function PositionSelector({ debate }: { debate: Debate }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [format, setFormat] = useState<DebateFormat>(debate.format);

  function proceed() {
    if (!choice) return;

    // "Undecided" and "assign" both resolve to a real side before round one.
    const assigned = choice === "assign" || choice === "undecided";
    const resolved: "support" | "oppose" =
      choice === "support" || choice === "oppose"
        ? choice
        : Math.random() < 0.5
          ? "support"
          : "oppose";

    track("position_selected", {
      debate: debate.slug,
      assigned,
      format,
      confidence,
    });

    const query = new URLSearchParams({
      position: resolved,
      assigned: assigned ? "1" : "0",
      confidence: String(confidence),
      format,
    });

    router.push(`/arena/${debate.slug}/match?${query.toString()}`);
  }

  return (
    <div className="space-y-10">
      <section>
        <Eyebrow tone="accent">Step 1</Eyebrow>
        <h2 className="mt-2 text-2xl sm:text-3xl">Choose your position</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
          Your side does not affect your score. NGN judges how you argue, not
          what you argue for.
        </p>

        <div
          role="radiogroup"
          aria-label="Your position"
          className="mt-6 grid gap-3 sm:grid-cols-2"
        >
          {CHOICES.map((option) => {
            const active = choice === option.id;
            const style = TONE_STYLES[option.tone];
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setChoice(option.id)}
                className="rounded-sm border p-5 text-left transition-all duration-150"
                style={{
                  borderColor: active ? style.border : "var(--color-rule)",
                  backgroundColor: active ? style.bg : "var(--color-paper-raised)",
                  boxShadow: active ? `inset 0 0 0 1px ${style.border}` : undefined,
                }}
              >
                <span
                  className="text-base font-semibold"
                  style={{ color: active ? style.text : "var(--color-ink)" }}
                >
                  {option.label}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-ink-mute">
                  {option.body}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {choice && (
        <>
          <section className="animate-rise border-t border-rule pt-8">
            <Eyebrow tone="accent">Step 2</Eyebrow>
            <h2 className="mt-2 text-2xl">How strongly do you feel right now?</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
              Recorded privately before you start, so you can see later whether
              the debate moved you. Never shown to your opponent.
            </p>

            <div className="mt-6 max-w-md">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setConfidence(value)}
                    aria-pressed={confidence === value}
                    aria-label={`${value} out of 5`}
                    className={`h-11 flex-1 rounded-sm border text-sm font-semibold transition-colors ${
                      confidence === value
                        ? "border-ink bg-ink text-ink-inverse"
                        : "border-rule bg-paper-raised text-ink-soft hover:border-rule-strong"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-faint">
                <span>Not sure at all</span>
                <span>Very strongly</span>
              </div>
            </div>
          </section>

          <section className="animate-rise border-t border-rule pt-8">
            <Eyebrow tone="accent">Step 3</Eyebrow>
            <h2 className="mt-2 text-2xl">Pick a format</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {FORMAT_LIST.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormat(option.id)}
                  aria-pressed={format === option.id}
                  className={`rounded-sm border p-4 text-left transition-colors ${
                    format === option.id
                      ? "border-ink bg-paper-raised shadow-[inset_0_0_0_1px_var(--color-ink)]"
                      : "border-rule bg-paper-raised hover:border-rule-strong"
                  }`}
                >
                  <span className="text-sm font-semibold">{option.name}</span>
                  <span className="mt-1 block text-xs text-ink-mute">
                    {option.rounds.length} rounds · {option.estimateLabel}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="animate-rise border-t border-rule pt-8">
            <Button size="lg" onClick={proceed}>
              Find an opponent
            </Button>
            <p className="mt-3 text-xs text-ink-faint">
              You can leave a debate at any time. Leaving mid-debate does not
              affect your rating.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
