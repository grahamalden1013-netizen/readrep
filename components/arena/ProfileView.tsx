"use client";

import Link from "next/link";
import { useArena } from "@/components/providers/ArenaProvider";
import {
  ButtonLink,
  Card,
  EmptyState,
  Eyebrow,
  Meter,
  Pill,
  SectionHead,
  Stat,
} from "@/components/ui/primitives";
import { DivisionProgress, RatingDelta } from "@/components/ratings/DivisionBadge";
import { CategoryBreakdown } from "@/components/ratings/ScoreCard";
import { averagePerspective, bestCategory, categoryAverages } from "@/lib/arena/profile";
import { categoryLabel } from "@/lib/ai/debateJudge";
import { BADGES, badgeProgress } from "@/lib/arena/badges";
import { getDebate } from "@/data/demo/debates";

/**
 * The public profile.
 *
 * What is deliberately absent: email, birthday, precise location, follower
 * count, and any political label. School and state are optional and blank by
 * default. For a product with a large minor userbase, the safest field is the
 * one that does not exist.
 */
export function ProfileView() {
  const { ready, profile, history } = useArena();

  if (!ready) {
    return <p className="py-20 text-center text-sm text-ink-mute">Loading profile…</p>;
  }

  if (!profile || profile.debatesCompleted === 0) {
    return (
      <EmptyState
        title="Your first debate starts here."
        body="Complete a debate and this page fills with your rating, your category averages, your badges and your full record."
        action={<ButtonLink href="/arena">Enter the Arena</ButtonLink>}
      />
    );
  }

  const averages = categoryAverages(profile);
  const best = bestCategory(profile);
  const perspective = averagePerspective(profile);
  const progress = badgeProgress(profile);
  const earned = new Set(profile.badges.map((b) => b.id));
  const recent = history.slice(0, 6);

  return (
    <div className="space-y-14">
      {/* --- Identity ---------------------------------------------------- */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div>
          <Eyebrow>Profile</Eyebrow>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {profile.username}
          </h1>
          {profile.firstName && (
            <p className="mt-1 text-sm text-ink-mute">{profile.firstName}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.school && <Pill>{profile.school}</Pill>}
            {profile.state && <Pill>{profile.state}</Pill>}
            {profile.gradeBand && <Pill>Grade {profile.gradeBand}</Pill>}
            {profile.streakDays > 1 && (
              <Pill tone="accent">{profile.streakDays}-day streak</Pill>
            )}
          </div>

          <div className="mt-8 flex items-baseline gap-4">
            <span className="tnum text-5xl font-semibold leading-none sm:text-6xl">
              {profile.rating}
            </span>
            <div className="text-xs text-ink-mute">
              <p>Arena Rating</p>
              <p className="tnum mt-0.5">Peak {profile.peakRating}</p>
            </div>
          </div>

          <div className="mt-6 max-w-sm">
            <DivisionProgress rating={profile.rating} />
          </div>
        </div>

        <Card className="p-5 sm:p-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2">
            <Stat value={profile.debatesCompleted} label="Debates" />
            <Stat value={profile.wins} label="Wins" tone="support" />
            <Stat value={profile.losses} label="Losses" tone="oppose" />
            <Stat value={profile.draws} label="Draws" />
          </dl>
          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-rule pt-6">
            <Stat
              value={perspective ?? "—"}
              label="Perspective Score"
              tone="accent"
            />
            <Stat
              value={best ? categoryLabel(best) : "—"}
              label="Best category"
            />
          </div>
          <p className="mt-5 border-t border-rule pt-4 text-xs leading-relaxed text-ink-faint">
            Perspective Score is tracked separately from Arena Rating and never
            affects it.
          </p>
        </Card>
      </section>

      {/* --- Category averages ------------------------------------------- */}
      {averages && (
        <section>
          <SectionHead
            title="Your argument profile"
            description="Running averages across every debate you have completed."
          />
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
            <Card className="p-5 sm:p-6">
              <CategoryBreakdown categories={averages} />
            </Card>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                {best === "opponentUnderstanding"
                  ? "Your strongest category is understanding your opponent — the hardest one to fake and the one that transfers furthest outside the Arena."
                  : best === "evidence"
                    ? "Evidence is your strongest category. The next gain is usually in rebuttal: aim your sourced claims directly at what your opponent actually wrote."
                    : `Your strongest category is ${best ? categoryLabel(best) : "—"}. Look at your lowest bar for the fastest available improvement.`}
              </p>
              <div className="rounded-sm border border-rule bg-paper-sunken/60 p-4">
                <h3 className="text-sm font-semibold">How the weighting works</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mute">
                  Reasoning is worth the most at 25%. Evidence, Rebuttal and
                  Understanding Opponent are each worth 20% — understanding the
                  other side counts exactly as much as citing a source. Civility
                  is only 5%: enough to make contempt costly, not enough to make
                  politeness a strategy.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- Rating history ---------------------------------------------- */}
      {profile.ratingHistory.length > 1 && (
        <section>
          <SectionHead title="Rating history" />
          <RatingSparkline
            points={profile.ratingHistory.map((entry) => entry.rating)}
          />
        </section>
      )}

      {/* --- Recent debates ---------------------------------------------- */}
      <section>
        <SectionHead
          title="Recent debates"
          action={<Link href="/arena" className="font-medium text-accent hover:underline">Find a debate →</Link>}
        />
        {recent.length === 0 ? (
          <EmptyState
            title="No debate history yet."
            body="Completed debates show up here with the result, the rating change and the transcript."
          />
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {recent.map((run) => {
              const debate = getDebate(run.debateSlug);
              return (
                <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {debate?.title ?? run.debateSlug}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-mute">
                      <span>vs {run.opponent.username}</span>
                      <span aria-hidden>·</span>
                      <span className="capitalize">{run.position}</span>
                      {run.wasAssigned && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="text-accent">assigned side</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {run.userScore && (
                      <span className="tnum text-sm font-semibold">
                        {run.userScore.overall}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium uppercase tracking-wide ${
                        run.outcome === "win"
                          ? "text-support"
                          : run.outcome === "loss"
                            ? "text-oppose"
                            : "text-ink-mute"
                      }`}
                    >
                      {run.outcome}
                    </span>
                    <RatingDelta delta={(run.ratingAfter ?? 0) - run.ratingBefore} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Badges ------------------------------------------------------ */}
      <section>
        <SectionHead
          title="Badges"
          description="Earned by arguing better, never by posting more."
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((badge) => {
            const has = earned.has(badge.id);
            const value = progress[badge.id];
            return (
              <li
                key={badge.id}
                className={`rounded-sm border p-4 ${
                  has
                    ? "border-lime-deep bg-accent-soft"
                    : "border-rule bg-paper-raised"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`text-sm font-semibold ${has ? "" : "text-ink-mute"}`}>
                    {badge.name}
                  </h3>
                  {has && <Pill tone="accent">Earned</Pill>}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mute">
                  {has ? badge.description : badge.criterion}
                </p>
                {!has && (
                  <div className="mt-3">
                    <Meter
                      value={Math.min(value, badge.target)}
                      max={badge.target}
                      tone="lime"
                      compact
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- Privacy ----------------------------------------------------- */}
      <section className="rounded-sm border border-rule bg-paper-sunken/60 p-5">
        <h2 className="text-sm font-semibold">What this page does not show</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-mute">
          Your email, your birthday, your precise location and your political
          views are never displayed here or anywhere else on NGN. School and
          state are optional and blank unless you add them. There are no
          follower counts. Your Issue Profile, if you have taken it, is private
          by default and can be deleted at any time.
        </p>
      </section>
    </div>
  );
}

/**
 * Rating sparkline. Drawn as inline SVG so it needs no chart dependency and
 * scales cleanly at any container width.
 */
function RatingSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;

  const width = 600;
  const height = 120;
  const min = Math.min(...points) - 20;
  const max = Math.max(...points) + 20;
  const span = Math.max(1, max - min);

  const coords = points.map((value, index) => ({
    x: (index / (points.length - 1)) * width,
    y: height - ((value - min) / span) * height,
  }));

  const path = coords
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <div className="card p-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-24 w-full sm:h-32"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Rating history: from ${points[0]} to ${points[points.length - 1]} across ${points.length} debates`}
      >
        <path d={area} fill="var(--color-accent-soft)" />
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-3 flex justify-between text-xs text-ink-mute">
        <span className="tnum">{points[0]}</span>
        <span>{points.length} debates</span>
        <span className="tnum font-semibold text-ink">
          {points[points.length - 1]}
        </span>
      </div>
    </div>
  );
}
