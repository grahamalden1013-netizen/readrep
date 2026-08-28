import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Pill,
  DemoBadge,
} from "@/components/ui/primitives";
import { ArgumentColumns, PartyPerspectives } from "@/components/debate/ArgumentColumns";
import { KeyTermsList, SourceList } from "@/components/debate/BriefSections";
import { IDontGetIt } from "@/components/explain/IDontGetIt";
import { SentimentBar } from "@/components/arena/SentimentBar";
import { Countdown } from "@/components/arena/Countdown";
import { DEBATES, getDebate } from "@/data/demo/debates";
import { formatFor } from "@/lib/arena/formats";

export function generateStaticParams() {
  return DEBATES.map((debate) => ({ slug: debate.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) return { title: "Debate not found" };
  return {
    title: `${debate.title} — Briefing`,
    description: debate.description,
  };
}

/** Section wrapper: one consistent rhythm down the whole briefing. */
function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-rule pt-8">
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-mute">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function BriefPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = getDebate(slug);
  if (!debate) notFound();

  const { brief } = debate;
  const format = formatFor(debate.format);

  // Context handed to the explainer, so it can only reshape neutral material
  // this page already shows rather than introducing new claims.
  const explainerContext = [
    brief.question,
    ...brief.sixtySecond,
    ...brief.keyFacts,
  ].join(" ");

  return (
    <>
      <header className="border-b border-rule bg-paper-raised">
        <Container className="py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              href="/arena"
              className="text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline"
            >
              ← Arena
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow tone="accent">Debate Briefing</Eyebrow>
            <span aria-hidden className="h-3 w-px bg-rule" />
            <Eyebrow>{debate.category}</Eyebrow>
          </div>

          <h1 className="mt-3 max-w-4xl text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
            {debate.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <Pill>{debate.difficulty}</Pill>
            <Pill>{format.name} · {format.rounds.length} rounds</Pill>
            <Pill>{format.estimateLabel}</Pill>
            {debate.tags.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>

          <div className="mt-7 grid gap-6 border-t border-rule pt-6 sm:grid-cols-[auto_1fr] sm:gap-10">
            <dl className="flex gap-8">
              <div>
                <dt className="eyebrow text-ink-mute">Debating</dt>
                <dd className="tnum mt-1 text-lg font-semibold">
                  {debate.participants.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-mute">Closes in</dt>
                <dd className="mt-1 text-lg font-semibold">
                  <Countdown hours={debate.hoursRemaining} />
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-mute">Avg score</dt>
                <dd className="tnum mt-1 text-lg font-semibold">{debate.averageScore}</dd>
              </div>
            </dl>
            <div className="sm:max-w-sm sm:justify-self-end">
              <SentimentBar
                support={debate.sentiment.support}
                oppose={debate.sentiment.oppose}
                undecided={debate.sentiment.undecided}
              />
            </div>
          </div>
        </Container>
      </header>

      <Container width="reading" className="py-10 sm:py-14">
        {/* --- The question ---------------------------------------------- */}
        <section>
          <h2 className="text-xl sm:text-2xl">The question</h2>
          <p className="mt-4 border-l-2 border-lime-deep pl-5 font-serif text-xl leading-snug sm:text-2xl">
            {brief.question}
          </p>
          <div className="mt-6">
            <IDontGetIt topic={debate.title} context={explainerContext} />
          </div>
        </section>

        <div className="mt-10 space-y-10">
          <Section
            id="sixty-second"
            title="The 60-second brief"
            note="Neutral background. No position taken."
          >
            <div className="prose-ngn">
              {brief.sixtySecond.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </Section>

          <Section
            id="arguments"
            title="What each side argues"
            note="Both columns are the strongest version of each case, at equal length."
          >
            <ArgumentColumns
              support={brief.supporterArguments}
              oppose={brief.opponentArguments}
            />
          </Section>

          {(brief.democraticView || brief.republicanView) && (
            <Section
              id="parties"
              title="How the parties see it"
              note="Where applicable. Party positions are not uniform, and the internal disagreements matter."
            >
              <PartyPerspectives
                democraticView={brief.democraticView}
                republicanView={brief.republicanView}
                democraticDisagreement={brief.democraticDisagreement}
                republicanDisagreement={brief.republicanDisagreement}
                otherPerspectives={brief.otherPerspectives}
              />
            </Section>
          )}

          <Section
            id="facts"
            title="Key facts"
            note="What you need to know before you can argue this well."
          >
            <ul className="space-y-3">
              {brief.keyFacts.map((fact, index) => (
                <li key={index} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-lime-deep" />
                  <span className="text-[0.9375rem] leading-relaxed text-ink-soft">
                    {fact}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {brief.statistics.length > 0 && (
            <Section id="numbers" title="Important numbers">
              <dl className="grid gap-4 sm:grid-cols-3">
                {brief.statistics.map((stat) => {
                  const source = brief.sources.find((s) => s.id === stat.sourceId);
                  return (
                    <div key={stat.label} className="card p-4">
                      <dt className="tnum text-2xl font-semibold leading-none">
                        {stat.value}
                      </dt>
                      <dd className="mt-2 text-xs leading-snug text-ink-mute">
                        {stat.label}
                        {source && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 block font-medium text-accent underline-offset-2 hover:underline"
                          >
                            {source.publisher}
                          </a>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Section>
          )}

          <Section id="terms" title="Key terms" note="Tap a term to expand it.">
            <KeyTermsList terms={brief.keyTerms} />
          </Section>

          <Section
            id="sources"
            title="Sources"
            note="Primary documents and official data first, then research, then reporting."
          >
            <SourceList sources={brief.sources} />
            <p className="mt-5 flex items-center gap-2 text-xs text-ink-faint">
              Demo briefing — an editor must verify every citation before publication.
              <DemoBadge />
            </p>
          </Section>
        </div>

        {/* --- Are you ready? -------------------------------------------- */}
        <section className="mt-14 rounded-sm border border-rule-strong bg-paper-raised p-6 sm:p-8">
          <h2 className="text-2xl">Are you ready?</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
            You do not have to agree with either side to argue it well. NGN scores
            how your argument is built, never which position you take.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href={`/arena/${debate.slug}/position`} size="lg">
              I&apos;m ready to debate
            </ButtonLink>
            <IDontGetIt topic={debate.title} context={explainerContext} />
            {debate.relatedIssueSlug && (
              <ButtonLink
                href={`/issues/${debate.relatedIssueSlug}`}
                tone="ghost"
                size="lg"
              >
                Read the full issue →
              </ButtonLink>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}
