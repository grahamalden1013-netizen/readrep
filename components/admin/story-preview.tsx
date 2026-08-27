import {
  textToPerspectives,
  textToSections,
  textToSources,
  textToTerms,
  linesOf,
  type EditableStory,
} from "@/lib/admin/editable";
import { QuickVersion } from "@/components/article/quick-version";
import { UnderstandTheSides } from "@/components/article/perspectives";
import {
  KeyTerms,
  SourceList,
  WhatWeKnow,
} from "@/components/article/facts-and-sources";
import type { Article } from "@/types/ngn";

/** Reader-eye preview built from the current editor state. */
export function StoryPreview({ story }: { story: EditableStory }) {
  const sections = textToSections(story.body);
  const previewArticle = {
    quickWhatHappened: story.quickWhatHappened,
    quickWhyItMatters: story.quickWhyItMatters,
    quickWhatNext: story.quickWhatNext,
  } as Article;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-paper p-6 sm:p-8">
      <h1 className="text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink">
        {story.headline || "Untitled draft"}
      </h1>
      {story.subheadline && (
        <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink-2">
          {story.subheadline}
        </p>
      )}

      {story.inTwentySeconds && (
        <div className="mt-7 rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <p className="eyebrow text-accent">In 20 seconds</p>
          <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-2">
            {story.inTwentySeconds}
          </p>
        </div>
      )}

      <div className="mt-8">
        <QuickVersion article={previewArticle} />
      </div>

      <div className="article-prose mt-10">
        {sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="mt-8 first:mt-0">
            {section.heading && (
              <h2 className="mb-3 text-[1.25rem] font-semibold tracking-[-0.02em] text-ink">
                {section.heading}
              </h2>
            )}
            {section.paragraphs.map((paragraph, pIndex) => (
              <p key={pIndex}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className="mt-4 space-y-2.5">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12">
        <UnderstandTheSides
          democratic={{
            label: story.democraticLabel || "Many Democratic lawmakers",
            summary: story.democraticSummary,
            points: linesOf(story.democraticPoints),
          }}
          republican={{
            label: story.republicanLabel || "Many Republican lawmakers",
            summary: story.republicanSummary,
            points: linesOf(story.republicanPoints),
          }}
          other={textToPerspectives(story.otherViews)}
        />
      </div>

      <div className="mt-12">
        <WhatWeKnow
          facts={linesOf(story.knownFacts)}
          uncertainties={linesOf(story.uncertainties)}
        />
      </div>

      <div className="mt-12">
        <KeyTerms terms={textToTerms(story.keyTerms)} />
      </div>

      <div className="mt-12">
        <SourceList sources={textToSources(story.sources)} />
      </div>
    </div>
  );
}
