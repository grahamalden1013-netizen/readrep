"use client";

import { useState } from "react";
import type { Debate } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import {
  Button,
  ButtonLink,
  EmptyState,
  Eyebrow,
  Meter,
  Pill,
} from "@/components/ui/primitives";
import { scorePerspective } from "@/app/actions/arena";
import { track } from "@/lib/analytics";
import type { PerspectiveFeedback } from "@/types/ngn";

/**
 * Switch Sides — the flagship exercise.
 *
 * The scoring is walled off from Arena Rating in `applyPerspectiveResult`, and
 * this screen says so twice: once before the student writes, once in the
 * result. If representing your opponent fairly earned ladder points it would
 * become a strategy instead of an exercise.
 */

const PERSPECTIVE_LABELS = {
  accuracy: "Accuracy",
  fairness: "Fairness",
  strength: "Strength",
  understanding: "Understanding",
  strawmanAvoidance: "No strawman",
} as const;

export function SwitchSides({ debate }: { debate: Debate }) {
  const { ready, activeRun, recordPerspective } = useArena();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PerspectiveFeedback | null>(null);

  if (!ready) {
    return <p className="py-20 text-center text-sm text-ink-mute">Loading…</p>;
  }

  const run = activeRun?.debateSlug === debate.slug ? activeRun : null;

  if (!run || !run.userScore) {
    return (
      <EmptyState
        title="Finish a debate first."
        body="Switch Sides asks you to argue the position you just argued against — so there has to be a debate behind it."
        action={<ButtonLink href={`/arena/${debate.slug}/brief`}>Read the briefing</ButtonLink>}
      />
    );
  }

  const existing = result ?? run.perspective;
  const targetSide = run.position === "support" ? "oppose" : "support";
  const targetLabel = targetSide === "support" ? "Support" : "Oppose";

  // Show the canonical arguments only AFTER submission, so the exercise tests
  // what the student understood rather than what they can paraphrase.
  const canonical =
    targetSide === "support"
      ? debate.brief.supporterArguments
      : debate.brief.opponentArguments;

  async function submit() {
    if (draft.trim().length < 40 || !run) return;
    setSubmitting(true);
    track("switch_sides_started", { debate: debate.slug });

    try {
      const feedback = await scorePerspective({
        debateSlug: debate.slug,
        originalPosition: run.position,
        response: draft.trim(),
      });
      setResult(feedback);
      recordPerspective(feedback);
      track("switch_sides_completed", {
        debate: debate.slug,
        score: feedback.score,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (existing) {
    return (
      <div className="space-y-10">
        <section className="text-center">
          <Eyebrow tone="accent">Perspective Score</Eyebrow>
          <p className="tnum mt-3 text-6xl font-semibold leading-none sm:text-7xl">
            {existing.score}
            <span className="text-2xl text-ink-faint">/100</span>
          </p>
          <p className="mt-4 text-sm text-ink-mute">
            This score does not affect your Arena Rating — in either direction.
          </p>
        </section>

        <section>
          <h2 className="text-xl">How you did</h2>
          <dl className="mt-5 space-y-4">
            {(Object.keys(PERSPECTIVE_LABELS) as (keyof typeof PERSPECTIVE_LABELS)[]).map(
              (key) => (
                <div key={key}>
                  <Meter
                    value={existing.categories[key]}
                    tone={key === "strawmanAvoidance" ? "accent" : "ink"}
                    label={PERSPECTIVE_LABELS[key]}
                    valueLabel={String(existing.categories[key])}
                  />
                </div>
              ),
            )}
          </dl>
        </section>

        <section className="space-y-5">
          <div className="border-l-2 border-support pl-4">
            <h3 className="eyebrow text-ink-mute">What you captured</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {existing.whatYouCaptured}
            </p>
          </div>
          <div className="border-l-2 border-oppose pl-4">
            <h3 className="eyebrow text-ink-mute">What you missed</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {existing.whatYouMissed}
            </p>
          </div>
          <p className="border-t border-rule pt-4 text-sm leading-relaxed text-ink-mute">
            {existing.summary}
          </p>
        </section>

        <section>
          <h2 className="text-xl">The arguments most often made on that side</h2>
          <p className="mt-1.5 text-sm text-ink-mute">
            Held back until now, so the exercise tested what you understood
            rather than what you could paraphrase.
          </p>
          <ol className="mt-5 space-y-4">
            {canonical.map((argument, index) => (
              <li key={index} className="flex gap-3">
                <span aria-hidden className="tnum mt-0.5 shrink-0 text-xs font-semibold text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{argument}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-wrap gap-3 border-t border-rule pt-8">
          <ButtonLink href={`/arena/${debate.slug}/results`} tone="secondary">
            Back to result
          </ButtonLink>
          <ButtonLink href="/arena">Find another debate</ButtonLink>
          <ButtonLink href="/profile" tone="ghost">
            View your profile
          </ButtonLink>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <Eyebrow tone="accent">Switch Sides</Eyebrow>
        <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
          Could you make your opponent&apos;s argument?
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-soft">
          You argued{" "}
          <strong className="font-semibold">
            {run.position === "support" ? "Support" : "Oppose"}
          </strong>
          . Now make the strongest possible case for{" "}
          <strong className="font-semibold">{targetLabel}</strong> — not a
          balanced summary, and not a concession. The case as its best advocate
          would make it.
        </p>
      </section>

      <section className="rounded-sm border border-rule bg-paper-sunken/60 p-5">
        <h2 className="text-sm font-semibold">What the judge is looking for</h2>
        <ul className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <li>· Does this match what people on that side actually argue?</li>
          <li>· Is it presented in good faith, at full strength?</li>
          <li>· Would it persuade an undecided reader?</li>
          <li>· Does it capture the underlying values, not just the talking points?</li>
        </ul>
        <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-ink-mute">
          A response that signals its own disagreement — &ldquo;of course, this
          ignores…&rdquo; — scores very low on strawman avoidance. Make the case,
          then stop.
        </p>
      </section>

      <section>
        <label className="block">
          <span className="text-sm font-medium">
            The strongest argument for the side I opposed is…
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder="Write it as its best advocate would. No hedging, no 'but'."
            className="mt-2 w-full resize-y rounded-sm border border-rule bg-paper px-4 py-3 text-[0.9375rem] leading-relaxed placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="tnum text-xs text-ink-faint">{draft.length} characters</span>
          <Pill tone="accent">3–5 minutes is plenty</Pill>
        </div>
      </section>

      <section className="border-t border-rule pt-6">
        <Button
          size="lg"
          onClick={submit}
          disabled={draft.trim().length < 40 || submitting}
        >
          {submitting ? "Scoring…" : "Submit for Perspective Score"}
        </Button>
        <p className="mt-3 text-xs text-ink-faint">
          Skipping this costs you nothing. Your rating is unaffected either way.
        </p>
        <ButtonLink
          href={`/arena/${debate.slug}/results`}
          tone="ghost"
          size="sm"
          className="mt-3"
        >
          Skip for now
        </ButtonLink>
      </section>
    </div>
  );
}
