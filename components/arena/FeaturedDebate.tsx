import Link from "next/link";
import type { Debate } from "@/types/ngn";
import {
  ButtonLink,
  Eyebrow,
  LiveDot,
  Pill,
} from "@/components/ui/primitives";
import { Countdown } from "./Countdown";
import { SentimentBar } from "./SentimentBar";
import { formatFor } from "@/lib/arena/formats";

/**
 * The hero debate card. This is the single most important surface in the
 * product — it has to make a student want to argue within about four seconds.
 */
export function FeaturedDebate({
  debate,
  eyebrow = "Today's Debate",
}: {
  debate: Debate;
  eyebrow?: string;
}) {
  const format = formatFor(debate.format);

  return (
    <article className="overflow-hidden rounded-sm border border-rule-strong bg-paper-raised">
      <div className="border-b border-rule bg-ink px-5 py-2.5 text-ink-inverse sm:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow text-lime">{eyebrow}</span>
          <span aria-hidden className="h-3 w-px bg-rule-inverse" />
          <span className="eyebrow text-ink-inverse/70">{debate.category}</span>
          {debate.status === "live" && (
            <span className="ml-auto flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-lime">
              <LiveDot /> Live now
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <h2 className="text-2xl leading-[1.12] sm:text-[2rem] lg:text-[2.5rem]">
            {debate.title}
          </h2>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-soft">
            {debate.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <Pill tone="accent">{debate.difficulty}</Pill>
            <Pill>{format.name} · {format.rounds.length} rounds</Pill>
            <Pill>{format.estimateLabel}</Pill>
            {debate.tags.slice(0, 2).map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/arena/${debate.slug}/position`} size="lg">
              Enter Debate
            </ButtonLink>
            <ButtonLink
              href={`/arena/${debate.slug}/brief`}
              tone="secondary"
              size="lg"
            >
              Understand the Issue
            </ButtonLink>
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Read the briefing first — you can enter the Arena from the bottom of it.
          </p>
        </div>

        <aside className="lg:border-l lg:border-rule lg:pl-10">
          <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-6">
            <div>
              <dt className="eyebrow text-ink-mute">Debating</dt>
              <dd className="tnum mt-1.5 text-xl font-semibold sm:text-2xl">
                {debate.participants.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-ink-mute">Avg score</dt>
              <dd className="tnum mt-1.5 text-xl font-semibold sm:text-2xl">
                {debate.averageScore}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-ink-mute">Closes in</dt>
              <dd className="mt-1.5 text-xl font-semibold sm:text-2xl">
                <Countdown hours={debate.hoursRemaining} />
              </dd>
            </div>
          </dl>

          <div className="mt-7 border-t border-rule pt-6">
            <Eyebrow>Where students stand</Eyebrow>
            <div className="mt-3">
              <SentimentBar
                support={debate.sentiment.support}
                oppose={debate.sentiment.oppose}
                undecided={debate.sentiment.undecided}
              />
            </div>
          </div>

          {debate.relatedArticleSlug && (
            <Link
              href={`/today/${debate.relatedArticleSlug}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Read the background brief
              <span aria-hidden>→</span>
            </Link>
          )}
        </aside>
      </div>
    </article>
  );
}
