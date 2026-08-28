"use client";

import Link from "next/link";
import { useState } from "react";
import type { Debate } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Eyebrow,
  Pill,
  SectionHead,
} from "@/components/ui/primitives";
import { CategoryBreakdown, JudgeNotes } from "@/components/ratings/ScoreCard";
import { DivisionBadge, RatingDelta } from "@/components/ratings/DivisionBadge";
import { divisionName } from "@/lib/arena/divisions";
import { BADGE_BY_ID } from "@/lib/arena/badges";
import { roundsFor } from "@/lib/arena/formats";
import { track } from "@/lib/analytics";
import type { BadgeId } from "@/types/ngn";

/**
 * The results screen.
 *
 * Deliberate ordering: the score, then what you did well, then what to fix,
 * then — before any rematch button — your opponent's strongest argument. The
 * last one is the point of the product, so it does not go below the fold.
 */
export function DebateResults({ debate }: { debate: Debate }) {
  const { ready, profile, activeRun } = useArena();
  const [shared, setShared] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  if (!ready) {
    return <p className="py-20 text-center text-sm text-ink-mute">Loading results…</p>;
  }

  const run = activeRun?.debateSlug === debate.slug ? activeRun : null;

  if (!run || !run.userScore || !run.opponentScore || run.outcome === null) {
    return (
      <EmptyState
        title="No result for this debate yet."
        body="Finish a debate on this question and your score, rating change and feedback will appear here."
        action={<ButtonLink href={`/arena/${debate.slug}/brief`}>Read the briefing</ButtonLink>}
      />
    );
  }

  const { userScore, opponentScore, outcome } = run;
  const delta = (run.ratingAfter ?? 0) - run.ratingBefore;
  const rounds = roundsFor(run.format);

  const headline =
    outcome === "win"
      ? `${profile?.username ?? "You"} win`
      : outcome === "loss"
        ? `${run.opponent.username} wins`
        : "Debate draw";

  // The opponent's best moment is pulled from their own judged transcript, so
  // it is a real assessment rather than a compliment we invented.
  const opponentBest = opponentScore.strongestMoment;

  const newBadgeIds = (profile?.badges ?? [])
    .slice(-2)
    .map((b) => b.id as BadgeId);

  async function share() {
    const text = `NGN Arena Score: ${userScore.overall} — Evidence ${userScore.categories.evidence}, Reasoning ${userScore.categories.reasoning}, Rebuttal ${userScore.categories.rebuttal}, Perspective ${run?.perspective?.score ?? "—"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "NGN Arena", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      track("debate_shared", { debate: debate.slug, score: userScore.overall });
    } catch {
      // A cancelled share is not an error worth surfacing.
    }
  }

  return (
    <div className="space-y-12">
      {/* --- Verdict ----------------------------------------------------- */}
      <section className="text-center">
        <Eyebrow tone="accent">Result</Eyebrow>
        <h1 className="mt-3 text-3xl leading-tight sm:text-5xl">{headline}</h1>
        <p className="tnum mt-4 text-2xl font-semibold sm:text-3xl">
          <span className={outcome === "win" ? "text-support" : outcome === "loss" ? "text-oppose" : ""}>
            {userScore.overall}
          </span>
          <span className="mx-2 text-ink-faint">–</span>
          <span className="text-ink-mute">{opponentScore.overall}</span>
        </p>
        <p className="mt-3 text-sm text-ink-mute">
          Scored on how the arguments were built. The side you argued had no
          effect on this result.
        </p>
      </section>

      {/* --- Rating ------------------------------------------------------ */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <Eyebrow>Your rating</Eyebrow>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="tnum text-lg text-ink-mute">{run.ratingBefore}</span>
            <span aria-hidden className="text-ink-faint">→</span>
            <span className="tnum text-3xl font-semibold">{run.ratingAfter}</span>
            <RatingDelta delta={delta} />
          </div>
          <div className="mt-3">
            <DivisionBadge division={divisionName(run.ratingAfter ?? run.ratingBefore)} size="sm" />
          </div>
        </Card>

        <Card className="p-5">
          <Eyebrow>{run.opponent.username}</Eyebrow>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="tnum text-lg text-ink-mute">{run.opponent.rating}</span>
            <span aria-hidden className="text-ink-faint">→</span>
            <span className="tnum text-3xl font-semibold">{run.opponentRatingAfter}</span>
            <RatingDelta delta={(run.opponentRatingAfter ?? 0) - run.opponent.rating} />
          </div>
          <div className="mt-3">
            <DivisionBadge division={run.opponent.division} size="sm" />
          </div>
        </Card>
      </section>

      {/* --- Badges ------------------------------------------------------ */}
      {newBadgeIds.length > 0 && (
        <section className="rounded-sm border border-lime-deep bg-accent-soft p-5">
          <Eyebrow tone="accent">Badge progress</Eyebrow>
          <ul className="mt-3 flex flex-wrap gap-2">
            {newBadgeIds.map((id) => {
              const badge = BADGE_BY_ID.get(id);
              if (!badge) return null;
              return (
                <li key={id}>
                  <Pill tone="accent">{badge.name}</Pill>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --- Score breakdown --------------------------------------------- */}
      <section>
        <SectionHead
          title="Your score breakdown"
          description="Weights are shown so you can see exactly what the ladder rewards."
        />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Card className="p-5 sm:p-6">
            <Eyebrow>You</Eyebrow>
            <div className="mt-4">
              <CategoryBreakdown categories={userScore.categories} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <Eyebrow>{run.opponent.username}</Eyebrow>
            <div className="mt-4">
              <CategoryBreakdown categories={opponentScore.categories} showWeights={false} />
            </div>
          </Card>
        </div>
      </section>

      {/* --- Judge feedback ---------------------------------------------- */}
      <section>
        <SectionHead title="What the judge saw" />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <JudgeNotes feedback={userScore} />

          <div className="space-y-6">
            {userScore.unsupportedClaims.length > 0 && (
              <div>
                <h3 className="eyebrow text-ink-mute">Claims without support</h3>
                <ul className="mt-3 space-y-2">
                  {userScore.unsupportedClaims.map((claim, index) => (
                    <li
                      key={index}
                      className="border-l-2 border-warn/50 pl-3 text-sm italic leading-relaxed text-ink-soft"
                    >
                      &ldquo;{claim}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {userScore.missedCounterarguments.length > 0 && (
              <div>
                <h3 className="eyebrow text-ink-mute">Points you did not answer</h3>
                <ul className="mt-3 space-y-2">
                  {userScore.missedCounterarguments.map((claim, index) => (
                    <li
                      key={index}
                      className="border-l-2 border-oppose/40 pl-3 text-sm italic leading-relaxed text-ink-soft"
                    >
                      &ldquo;{claim}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="border-t border-rule pt-4 text-sm leading-relaxed text-ink-mute">
              {userScore.summary}
            </p>
          </div>
        </div>
      </section>

      {/* --- Opponent's strongest argument ------------------------------- */}
      <section className="rounded-sm border border-rule-strong bg-ink p-6 text-ink-inverse sm:p-8">
        <span className="eyebrow text-lime">Your opponent&apos;s strongest argument</span>
        <p className="mt-4 font-serif text-lg leading-relaxed sm:text-xl">
          {opponentBest}
        </p>
        <p className="mt-5 border-t border-rule-inverse pt-4 text-sm leading-relaxed text-ink-inverse/65">
          Reading this before you argue again is the fastest way to raise your
          rebuttal score. You cannot answer an argument you have not understood.
        </p>
      </section>

      {/* --- Switch Sides ------------------------------------------------ */}
      <section className="rounded-sm border-2 border-lime-deep bg-accent-soft p-6 sm:p-8">
        <Eyebrow tone="accent">Flagship exercise</Eyebrow>
        <h2 className="mt-3 text-2xl sm:text-3xl">Could you make their argument?</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
          You just spent this debate arguing{" "}
          {run.position === "support" ? "for" : "against"} the proposition. Now
          make the strongest possible case for the side you argued against.
          Scored separately — it can never affect your Arena Rating in either
          direction.
        </p>
        <ButtonLink
          href={`/arena/${debate.slug}/switch-sides`}
          size="lg"
          className="mt-6"
        >
          Switch Sides
        </ButtonLink>
      </section>

      {/* --- Actions ----------------------------------------------------- */}
      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/arena/${debate.slug}/position`} tone="secondary">
            Rematch
          </ButtonLink>
          <Button tone="secondary" onClick={share}>
            {shared ? "Copied" : "Share result"}
          </Button>
          <Button
            tone="secondary"
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
          >
            {showTranscript ? "Hide" : "View"} full debate
          </Button>
          <ButtonLink href="/arena" tone="ghost">
            Back to Arena
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Shared cards show your skill scores only — never your political
          position, unless you write it in yourself.
        </p>
      </section>

      {/* --- Transcript --------------------------------------------------- */}
      {showTranscript && (
        <section className="animate-rise border-t border-rule pt-8">
          <SectionHead title="Full transcript" />
          <ol className="space-y-8">
            {run.rounds.map((entry) => (
              <li key={entry.roundIndex}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="eyebrow text-ink-mute">
                    Round {entry.roundIndex + 1} — {rounds[entry.roundIndex]?.label}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-rule" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <article className="border-l-2 border-support pl-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
                      {profile?.username ?? "You"}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                      {entry.userText}
                    </p>
                  </article>
                  <article className="border-l-2 border-oppose pl-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
                      {run.opponent.username}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                      {entry.opponentText}
                    </p>
                  </article>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href={`/arena/${debate.slug}/brief`}
            className="mt-6 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Re-read the briefing →
          </Link>
        </section>
      )}
    </div>
  );
}
