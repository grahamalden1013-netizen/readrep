"use client";

import { useState } from "react";
import type { IssueProfile } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import { Button, Eyebrow, Meter, Pill } from "@/components/ui/primitives";

/**
 * The optional Issue Profile.
 *
 * Two rules this component exists to enforce:
 *  1. It never outputs a label. There is no "you are a Republican" state.
 *     The result is a per-area alignment percentage with both major party
 *     platforms, which are frequently both high, and that is the point.
 *  2. It is private by default and deletable in one click.
 */

const AXES = [
  {
    id: "economy",
    label: "Economy",
    statement:
      "Government should play a larger role in setting wages and regulating markets.",
  },
  {
    id: "government",
    label: "Government",
    statement:
      "Most policy decisions are better made at the federal level than by individual states.",
  },
  {
    id: "social",
    label: "Social Policy",
    statement:
      "Government should generally stay out of decisions people make about their own lives.",
  },
  {
    id: "foreign",
    label: "Foreign Policy",
    statement:
      "The United States should maintain active military commitments to its allies abroad.",
  },
  {
    id: "environment",
    label: "Environment",
    statement:
      "Reducing emissions is worth accepting higher near-term energy costs.",
  },
  {
    id: "technology",
    label: "Technology",
    statement:
      "Technology companies should face binding federal rules before they release new systems.",
  },
] as const;

const SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

/**
 * Alignment is computed as proximity to each platform's published position on
 * the same statement — never as a distance from a party "centre", which is
 * what produces a label rather than a description.
 */
const PLATFORM_POSITIONS: Record<string, { democratic: number; republican: number }> = {
  economy: { democratic: 4, republican: 2 },
  government: { democratic: 4, republican: 2 },
  social: { democratic: 4, republican: 3 },
  foreign: { democratic: 4, republican: 4 },
  environment: { democratic: 4, republican: 2 },
  technology: { democratic: 4, republican: 2 },
};

function proximity(answer: number, platform: number): number {
  // 0 distance → 100%, maximum distance of 4 → 0%.
  return Math.round((1 - Math.abs(answer - platform) / 4) * 100);
}

export function IssueProfileQuiz() {
  const { ready, profile, setIssueProfile } = useArena();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<IssueProfile | null>(null);

  const existing = result ?? profile?.issueProfile ?? null;
  const answered = Object.keys(answers).length;

  function compute() {
    const axes = AXES.map((axis) => {
      const answer = answers[axis.id] ?? 3;
      const platform = PLATFORM_POSITIONS[axis.id];
      return {
        label: axis.label,
        democraticAlignment: proximity(answer, platform.democratic),
        republicanAlignment: proximity(answer, platform.republican),
      };
    });

    const average = (key: "democraticAlignment" | "republicanAlignment") =>
      Math.round(axes.reduce((sum, a) => sum + a[key], 0) / axes.length);

    const next: IssueProfile = {
      takenAt: new Date().toISOString(),
      axes,
      democraticAlignment: average("democraticAlignment"),
      republicanAlignment: average("republicanAlignment"),
    };

    setResult(next);
    setIssueProfile(next, false);
  }

  if (!ready) {
    return <p className="py-20 text-center text-sm text-ink-mute">Loading…</p>;
  }

  if (existing) {
    return (
      <div className="space-y-10">
        <section>
          <Eyebrow tone="accent">Your Issue Profile</Eyebrow>
          <h2 className="mt-2 text-2xl sm:text-3xl">
            Where your answers sit relative to each platform
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="eyebrow text-ink-mute">Democratic platform alignment</p>
              <p className="tnum mt-2 text-3xl font-semibold">
                {existing.democraticAlignment}%
              </p>
            </div>
            <div className="card p-5">
              <p className="eyebrow text-ink-mute">Republican platform alignment</p>
              <p className="tnum mt-2 text-3xl font-semibold">
                {existing.republicanAlignment}%
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg">By area</h3>
          <ul className="mt-5 space-y-5">
            {existing.axes.map((axis) => (
              <li key={axis.label}>
                <p className="text-sm font-medium">{axis.label}</p>
                <div className="mt-2 space-y-2">
                  <Meter
                    value={axis.democraticAlignment}
                    label="Democratic platform"
                    valueLabel={`${axis.democraticAlignment}%`}
                    compact
                  />
                  <Meter
                    value={axis.republicanAlignment}
                    label="Republican platform"
                    valueLabel={`${axis.republicanAlignment}%`}
                    compact
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-sm border-l-2 border-lime-deep bg-paper-sunken/60 p-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="font-semibold">
              This is not a label or a recommendation.
            </strong>{" "}
            Political beliefs are more complex than a score. Alignment with both
            platforms is often high at once, because platforms are coalitions
            rather than coherent philosophies — and because you can agree with a
            party about one thing and disagree about the next.
          </p>
        </section>

        <section className="border-t border-rule pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="accent">
              {profile?.issueProfileVisible ? "Visible on profile" : "Private"}
            </Pill>
            <Button
              tone="secondary"
              size="sm"
              onClick={() =>
                setIssueProfile(existing, !(profile?.issueProfileVisible ?? false))
              }
            >
              {profile?.issueProfileVisible ? "Make private" : "Show on my profile"}
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                setIssueProfile(null, false);
                setResult(null);
                setAnswers({});
              }}
            >
              Delete this profile
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Private by default. NGN never shows your political views to
            opponents, classmates or teachers, and never uses them for matching.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-sm border border-rule bg-paper-sunken/60 p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          This quiz does not tell you what you are. It shows how closely your
          answers track each major party&apos;s published platform, area by
          area. It is optional, private by default, and you can delete it at any
          time.
        </p>
      </div>

      <ol className="space-y-8">
        {AXES.map((axis, index) => (
          <li key={axis.id}>
            <div className="flex items-baseline gap-3">
              <span aria-hidden className="tnum text-xs font-semibold text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-ink-mute">{axis.label}</p>
                <p className="mt-1.5 font-serif text-lg leading-snug">
                  {axis.statement}
                </p>
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label={axis.statement}
              className="mt-4 grid grid-cols-5 gap-1.5 sm:ml-8"
            >
              {SCALE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={answers[axis.id] === option.value}
                  aria-label={option.label}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [axis.id]: option.value }))
                  }
                  className={`flex h-14 flex-col items-center justify-center gap-1 rounded-sm border px-1 text-center transition-colors ${
                    answers[axis.id] === option.value
                      ? "border-ink bg-ink text-ink-inverse"
                      : "border-rule bg-paper-raised text-ink-mute hover:border-rule-strong"
                  }`}
                >
                  <span className="tnum text-sm font-semibold">{option.value}</span>
                  <span className="hidden text-[0.5625rem] leading-tight sm:block">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-rule pt-6">
        <Button size="lg" onClick={compute} disabled={answered < AXES.length}>
          See my Issue Profile
        </Button>
        <p className="mt-3 text-xs text-ink-faint">
          {answered} of {AXES.length} answered. Nothing is stored until you
          finish, and nothing is shared even then.
        </p>
      </div>
    </div>
  );
}
