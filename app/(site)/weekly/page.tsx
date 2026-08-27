import type { Metadata } from "next";
import { getFeaturedWeekly, getWeeklyArticles } from "@/lib/content/repository";
import { getAuthor } from "@/lib/content/authors";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";
import { WeeklyCard, WeeklyFeature } from "@/components/weekly/weekly-cards";

export const metadata: Metadata = {
  title: "The NGN Weekly",
  description:
    "One longer editor's article each week. Clearly labelled opinion, never presented as neutral news.",
};

export default async function WeeklyPage() {
  const [featured, all] = await Promise.all([
    getFeaturedWeekly(),
    getWeeklyArticles(),
  ]);
  const rest = all.filter((weekly) => weekly.id !== featured.id);
  const editor = getAuthor(featured.authorId);

  return (
    <Container wide className="py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow text-editorial">The NGN Weekly</p>
          <h1 className="display mt-5 text-[2.75rem] leading-[1.02] text-ink sm:text-[4rem]">
            One longer piece,
            <br />
            once a week.
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-[1.6] text-ink-2">
            Signed opinion from the editor about how politics is covered, how it
            is understood, and what gets left out. The Weekly is labelled
            opinion because it is opinion — the rest of NGN is not.
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-6">
          <p className="eyebrow text-ink-3">Written by</p>
          <div className="mt-4 flex items-start gap-4">
            <Avatar initials={editor.initials} hue={editor.hue} size="xl" />
            <div>
              <p className="text-[1.0625rem] font-semibold tracking-tight text-ink">
                {editor.name}
              </p>
              <p className="text-[0.8125rem] text-editorial">{editor.role}</p>
              <p className="mt-2.5 text-[0.8125rem] leading-[1.6] text-ink-2">
                {editor.bio}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-hairline pt-4">
        <p className="eyebrow text-editorial">Latest edition</p>
        <div className="mt-5">
          <WeeklyFeature weekly={featured} />
        </div>
      </div>

      <div className="mt-16 border-t border-hairline pt-4">
        <p className="eyebrow text-ink-3">Previous editions</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((weekly) => (
            <WeeklyCard key={weekly.id} weekly={weekly} />
          ))}
        </div>
      </div>
    </Container>
  );
}
