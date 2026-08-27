import type { Metadata } from "next";
import { getAllSources } from "@/lib/content/repository";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Sources" };

export default async function AdminSourcesPage() {
  const sources = await getAllSources();

  return (
    <Container wide className="py-10">
      <p className="eyebrow text-accent">Sources</p>
      <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
        Every citation in the library
      </h1>
      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-6 text-ink-2">
        {sources.length} sources across all stories. Cards marked{" "}
        <span className="font-medium">link pending</span> have no verified URL
        yet and must be resolved before the story they support can be published
        in production.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
        <ul className="divide-y divide-hairline">
          {sources.map(({ source, articles }) => (
            <li key={source.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-medium text-ink-3">
                    {source.publisher}
                  </p>
                  <p className="mt-1 text-[0.9375rem] font-medium leading-snug text-ink">
                    {source.title}
                  </p>
                  <p className="mt-2 text-[0.75rem] text-ink-3">
                    Used by: {articles.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{source.kind}</Badge>
                  {source.isPlaceholder && (
                    <Badge variant="danger">Link pending</Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
