import type { Metadata } from "next";
import { MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { getDiscussions } from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { DiscussionCard } from "@/components/discussion/discussion-cards";

export const metadata: Metadata = {
  title: "Discuss",
  description:
    "Thoughtful political discussion for young people. No follower counts, no rankings — just the argument.",
};

const PRINCIPLES = [
  {
    Icon: Sparkles,
    title: "Challenge ideas, not people",
    body: "The only reaction here is “made me think”. There is no way to pile on.",
  },
  {
    Icon: ShieldCheck,
    title: "Moderated before it appears",
    body: "Every response is screened. Personal information is removed automatically.",
  },
  {
    Icon: MessagesSquare,
    title: "No followers, no ranking",
    body: "Nobody has an audience here. Arguments stand on their own.",
  },
];

export default async function DiscussPage() {
  const discussions = await getDiscussions();

  return (
    <Container wide className="py-10 sm:py-14">
      <p className="eyebrow text-accent">Discuss</p>
      <h1 className="mt-4 max-w-3xl text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.875rem]">
        Thoughtful political discussion, for people who are still deciding
      </h1>
      <p className="mt-4 max-w-2xl text-[1.0625rem] leading-[1.6] text-ink-2">
        You are allowed to change your mind here. That is the point.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {PRINCIPLES.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5"
          >
            <Icon className="size-4 text-accent" aria-hidden />
            <p className="mt-3 text-[0.9375rem] font-semibold text-ink">
              {title}
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-[1.55] text-ink-3">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 border-t border-hairline pt-4">
        <p className="eyebrow text-ink-3">Open questions</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {discussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))}
        </div>
      </div>
    </Container>
  );
}
