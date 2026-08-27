import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { Article } from "@/types/ngn";
import { CoverPlate } from "./cover-art";
import { CategoryBadge } from "./category-badge";
import { ReadTime } from "./story-meta";
import { DemoNotice } from "./demo-notice";
import { Button } from "@/components/ui/button";

/**
 * Homepage hero, with the "In 20 seconds" module attached beneath it.
 */
export function HeroStory({ story }: { story: Article }) {
  return (
    <section aria-labelledby="hero-headline" className="animate-rise">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div className="order-2 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={story.category} href="/politics" />
            {story.isDemo && <DemoNotice />}
          </div>

          <h1
            id="hero-headline"
            className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2.75rem] lg:text-[3rem]"
          >
            <Link
              href={`/story/${story.slug}`}
              className="transition-colors hover:text-accent"
            >
              {story.headline}
            </Link>
          </h1>

          <p className="mt-5 max-w-xl text-[1.0625rem] leading-[1.6] text-ink-2">
            {story.summary}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" variant="primary">
              <Link href={`/story/${story.slug}`}>
                Read story
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <ReadTime minutes={story.readTime} />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="rounded-[calc(var(--radius-card)+4px)] border border-hairline bg-surface p-2.5 shadow-card">
            <CoverPlate
              cover={story.cover}
              label={story.headline}
              ratio="aspect-[5/3]"
              eager
            />
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-7 sm:p-6">
          <div className="flex shrink-0 items-center gap-2 sm:w-40 sm:flex-col sm:items-start sm:gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
              <Zap className="size-4" aria-hidden />
            </span>
            <p className="eyebrow text-accent">In 20 seconds</p>
          </div>
          <p className="text-[0.9375rem] leading-[1.65] text-ink-2 sm:text-base">
            {story.inTwentySeconds}
          </p>
        </div>
      </div>
    </section>
  );
}
