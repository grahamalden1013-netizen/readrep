import type { CategoryScores, JudgeFeedback } from "@/types/ngn";
import { SCORE_CATEGORIES } from "@/types/ngn";
import { categoryLabel, SCORE_WEIGHTS } from "@/lib/ai/debateJudge";
import { Meter } from "@/components/ui/primitives";

/**
 * The six-category breakdown. Weights are shown alongside each label because a
 * student should be able to see exactly what the ladder rewards — particularly
 * that Understanding Opponent counts as much as Evidence.
 */
export function CategoryBreakdown({
  categories,
  showWeights = true,
  compact = false,
}: {
  categories: CategoryScores;
  showWeights?: boolean;
  compact?: boolean;
}) {
  return (
    <dl className="space-y-3.5">
      {SCORE_CATEGORIES.map((key) => (
        <div key={key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <dt className={compact ? "text-xs text-ink-soft" : "text-sm text-ink-soft"}>
              {categoryLabel(key)}
              {showWeights && (
                <span className="ml-1.5 text-[0.6875rem] text-ink-faint">
                  {Math.round(SCORE_WEIGHTS[key] * 100)}%
                </span>
              )}
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {categories[key]}
            </dd>
          </div>
          <Meter value={categories[key]} tone={key === "opponentUnderstanding" ? "accent" : "ink"} />
        </div>
      ))}
    </dl>
  );
}

export function OverallScore({
  score,
  label = "Overall",
  tone = "ink",
}: {
  score: number;
  label?: string;
  tone?: "ink" | "support" | "oppose";
}) {
  const tones = {
    ink: "text-ink",
    support: "text-support",
    oppose: "text-oppose",
  } as const;
  return (
    <div className="flex items-baseline gap-2">
      <span className={`tnum text-4xl font-semibold leading-none ${tones[tone]}`}>
        {score}
      </span>
      <span className="text-xs uppercase tracking-[0.12em] text-ink-mute">
        {label}
      </span>
    </div>
  );
}

/** A feedback block: strongest moment, weakest, and the one improvement. */
export function JudgeNotes({ feedback }: { feedback: JudgeFeedback }) {
  const blocks = [
    { title: "Your strongest moment", body: feedback.strongestMoment, tone: "support" as const },
    { title: "Where it was weakest", body: feedback.weakestMoment, tone: "oppose" as const },
    { title: "One thing to improve", body: feedback.improvement, tone: "accent" as const },
  ];

  return (
    <div className="space-y-5">
      {blocks.map((block) => (
        <div key={block.title} className="border-l-2 pl-4"
          style={{
            borderColor:
              block.tone === "support"
                ? "var(--color-support)"
                : block.tone === "oppose"
                  ? "var(--color-oppose)"
                  : "var(--color-lime-deep)",
          }}
        >
          <h4 className="eyebrow text-ink-mute">{block.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{block.body}</p>
        </div>
      ))}
    </div>
  );
}
