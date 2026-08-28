import Link from "next/link";
import {
  ButtonLink,
  Container,
  Eyebrow,
  SectionHead,
  Card,
  DemoBadge,
} from "@/components/ui/primitives";
import { FeaturedDebate } from "@/components/arena/FeaturedDebate";
import { DebateCard } from "@/components/arena/DebateCard";
import { ArticleCard, DebateThisIssue } from "@/components/news/ArticleCard";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { DEBATES, featuredDebate } from "@/data/demo/debates";
import { BRIEF_ARTICLES, latestWeekly } from "@/data/demo/articles";
import { weeklyTopStudents } from "@/data/demo/community";
import { DISCUSSIONS } from "@/data/demo/discussions";

/**
 * The homepage is the product, not a landing page for it. A student who has
 * never seen NGN should be able to read a brief and enter a debate without
 * scrolling past a single marketing section.
 */

export default function HomePage() {
  const featured = featuredDebate();
  const trending = DEBATES.filter((d) => !d.featured && d.status !== "upcoming").slice(0, 5);
  const briefs = BRIEF_ARTICLES.slice(0, 4);
  const weekly = latestWeekly();
  const leaders = weeklyTopStudents(5);
  const discussion = DISCUSSIONS[1];

  return (
    <>
      {/* --- Masthead ---------------------------------------------------- */}
      <section className="border-b border-rule">
        <Container className="py-10 sm:py-14">
          <div className="max-w-3xl">
            <Eyebrow tone="accent">NGN Arena</Eyebrow>
            <h1 className="mt-3 text-[2.25rem] leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Don&apos;t just have an opinion.{" "}
              <span className="relative whitespace-nowrap">
                Defend it.
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[3px] w-full bg-lime sm:-bottom-2 sm:h-[5px]"
                />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:mt-7 sm:text-lg">
              Understand the biggest issues. Debate other students. Build your
              argument skills.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/arena/${featured.slug}/position`} size="lg">
                Enter Today&apos;s Arena
              </ButtonLink>
              <ButtonLink href="/today" tone="secondary" size="lg">
                Read Today&apos;s Brief
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* --- Today's debate ---------------------------------------------- */}
      <Container className="py-10 sm:py-14">
        <FeaturedDebate debate={featured} />
      </Container>

      {/* --- Today's brief ----------------------------------------------- */}
      <Container className="pb-14">
        <SectionHead
          title="Today's Brief"
          description="What happened, why it matters, and what happens next — in two minutes each."
          action={
            <Link href="/today" className="font-medium text-accent underline-offset-4 hover:underline">
              All stories →
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {briefs.map((article) => (
            <li key={article.id} className="relative">
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>

        {briefs[0]?.relatedDebateSlug && (
          <div className="mt-4 max-w-md">
            <DebateThisIssue debateSlug={briefs[0].relatedDebateSlug} />
          </div>
        )}
      </Container>

      {/* --- Trending in the Arena --------------------------------------- */}
      <section className="border-y border-rule bg-paper-sunken/50">
        <Container className="py-14">
          <SectionHead
            title="Trending in the Arena"
            description="Open debates you can enter right now."
            action={
              <Link href="/arena" className="font-medium text-accent underline-offset-4 hover:underline">
                All debates →
              </Link>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((debate) => (
              <li key={debate.id} className="relative">
                <DebateCard debate={debate} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* --- Leaderboard + Weekly ---------------------------------------- */}
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
          <div>
            <SectionHead
              title="Top students this week"
              action={
                <Link href="/rankings" className="font-medium text-accent underline-offset-4 hover:underline">
                  Full rankings →
                </Link>
              }
            />
            <Card className="overflow-hidden">
              <ol>
                {leaders.map((entry) => (
                  <li
                    key={entry.username}
                    className="flex items-center gap-4 border-b border-rule px-4 py-3.5 last:border-b-0"
                  >
                    <span className="tnum w-5 shrink-0 text-sm text-ink-faint">
                      {entry.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.username}</p>
                      <div className="mt-0.5">
                        <DivisionBadge division={entry.division} size="sm" />
                      </div>
                    </div>
                    <span className="tnum shrink-0 text-sm font-semibold">
                      {entry.rating}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
              Ranked by Arena Rating — argument quality only, never popularity.
              <DemoBadge />
            </p>
          </div>

          <div>
            <SectionHead
              title="NGN Weekly"
              action={
                <Link href="/weekly" className="font-medium text-accent underline-offset-4 hover:underline">
                  Archive →
                </Link>
              }
            />
            <article className="border-l-2 border-lime-deep pl-6">
              <Eyebrow tone="accent">Editor&apos;s Article · Human-written analysis</Eyebrow>
              <h3 className="mt-3 text-2xl leading-tight sm:text-[1.75rem]">
                <Link href={`/today/${weekly.slug}`} className="hover:underline underline-offset-4 decoration-1">
                  {weekly.headline}
                </Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                {weekly.subheadline}
              </p>
              <p className="prose-ngn mt-5 line-clamp-4 !text-base">
                {weekly.body[0]}
              </p>
              <p className="mt-5 text-xs text-ink-faint">
                {weekly.author} · {weekly.readMinutes} min read · Opinion, clearly
                labelled and distinct from NGN&apos;s neutral news coverage.
              </p>
            </article>
          </div>
        </div>
      </Container>

      {/* --- Student voices ---------------------------------------------- */}
      <section className="border-t border-rule bg-ink text-ink-inverse">
        <Container className="py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
            <div>
              <span className="eyebrow text-lime">Student Voices</span>
              <h2 className="mt-3 text-2xl leading-tight text-ink-inverse sm:text-3xl">
                {discussion.question}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-inverse/70">
                {discussion.context}
              </p>
              <ButtonLink
                href={`/discuss/${discussion.slug}`}
                tone="accent"
                className="mt-6"
              >
                Join the discussion
              </ButtonLink>
            </div>

            <ul className="space-y-5">
              {discussion.responses.slice(0, 2).map((response) => (
                <li key={response.id} className="border-l border-rule-inverse pl-5">
                  <p className="text-[0.9375rem] leading-relaxed text-ink-inverse/85">
                    {response.body}
                  </p>
                  <p className="mt-3 flex items-center gap-3 text-xs text-ink-inverse/50">
                    <span className="font-medium text-ink-inverse/75">
                      {response.author}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="tnum">{response.madeMeThink} found this made them think</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
