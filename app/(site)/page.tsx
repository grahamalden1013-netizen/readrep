import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getDiscussions,
  getFeaturedIssues,
  getFeaturedWeekly,
  getHeroStory,
  getTodaysBrief,
} from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { Dateline } from "@/components/news/dateline";
import { HeroStory } from "@/components/news/hero-story";
import { StoryCard } from "@/components/news/story-card";
import { IssueTile } from "@/components/issues/issue-card";
import { WeeklyFeature } from "@/components/weekly/weekly-cards";
import {
  JoinDiscussionCta,
  ResponseBlock,
} from "@/components/discussion/discussion-cards";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function HomePage() {
  const [hero, brief, issues, weekly, discussions] = await Promise.all([
    getHeroStory(),
    getTodaysBrief(4),
    getFeaturedIssues(8),
    getFeaturedWeekly(),
    getDiscussions(),
  ]);

  const featuredDiscussion = discussions[0];

  return (
    <>
      <Container wide className="pb-6 pt-8 sm:pt-10">
        <Dateline storyCount={brief.length + 1} />
        <div className="pt-10 sm:pt-12">
          <HeroStory story={hero} />
        </div>
      </Container>

      <Container wide className="pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="Today's brief"
          title="What else is worth your time"
          description="Ranked by how much it changes, not by how much it is being shared."
          href="/today"
          linkLabel="Full daily brief"
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {brief.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </Container>

      <Container wide className="pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="Understand the issue"
          title="Background, before the headlines"
          description="Neutral guides to the debates that keep coming back — what each side argues, and where each side disagrees with itself."
          href="/issues"
          linkLabel="All 12 issues"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {issues.map((issue) => (
            <IssueTile key={issue.slug} issue={issue} />
          ))}
        </div>
      </Container>

      <Container wide className="pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="The NGN Weekly"
          tone="editorial"
          title="One longer piece, once a week"
          description="Signed opinion from the editor. Clearly labelled, never presented as neutral news."
          href="/weekly"
          linkLabel="All editions"
        />
        <div className="mt-8">
          <WeeklyFeature weekly={weekly} />
        </div>
      </Container>

      {featuredDiscussion && (
        <Container wide className="pt-16 sm:pt-20">
          <SectionHeading
            eyebrow="Student voices"
            title="This week's question"
            href="/discuss"
            linkLabel="All discussions"
          />

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            <div className="self-start rounded-[var(--radius-card)] border border-hairline bg-surface p-6 shadow-card">
              <h3 className="text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.025em] text-ink">
                {featuredDiscussion.question}
              </h3>
              <p className="mt-4 text-[0.9375rem] leading-[1.6] text-ink-2">
                {featuredDiscussion.context}
              </p>
              <div className="mt-6 rounded-lg bg-surface-2 px-4 py-3">
                <p className="text-[0.8125rem] text-ink-2">
                  <span className="font-semibold text-ink">
                    Before you post:
                  </span>{" "}
                  Challenge ideas, not people.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <JoinDiscussionCta
                  href={`/discuss/${featuredDiscussion.slug}`}
                />
                <Link
                  href="/discuss"
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  See other questions
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="space-y-7 divide-y divide-hairline [&>*+*]:pt-7">
              {featuredDiscussion.responses.slice(0, 3).map((response) => (
                <ResponseBlock key={response.id} response={response} />
              ))}
            </div>
          </div>
        </Container>
      )}
    </>
  );
}
