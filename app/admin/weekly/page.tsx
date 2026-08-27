import type { Metadata } from "next";
import Link from "next/link";
import { getWeeklyArticles } from "@/lib/content/repository";
import { getAuthor } from "@/lib/content/authors";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Weekly" };

export default async function AdminWeeklyPage() {
  const editions = await getWeeklyArticles();

  return (
    <Container wide className="py-10">
      <p className="eyebrow text-editorial">The NGN Weekly</p>
      <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
        Editor&rsquo;s articles
      </h1>
      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-6 text-ink-2">
        Weekly pieces are written by a named editor and published as opinion.
        They never enter the AI drafting pipeline.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
        <ul className="divide-y divide-hairline">
          {editions.map((edition) => {
            const author = getAuthor(edition.authorId);
            return (
              <li key={edition.id} className="flex flex-wrap items-center gap-4 p-5">
                <span className="font-mono text-[0.75rem] text-ink-3">
                  No. {edition.edition}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/weekly/${edition.slug}`}
                    className="text-[0.9375rem] font-medium text-ink transition-colors hover:text-editorial"
                  >
                    {edition.headline}
                  </Link>
                  <p className="mt-1 text-[0.8125rem] text-ink-3">{edition.dek}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar initials={author.initials} hue={author.hue} size="sm" />
                  <span className="text-[0.75rem] text-ink-3">{author.name}</span>
                </div>
                <span className="w-28 text-right text-[0.75rem] text-ink-3">
                  {formatDate(edition.publishedAt)}
                </span>
                {edition.featured && <Badge variant="editorial">Featured</Badge>}
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}
