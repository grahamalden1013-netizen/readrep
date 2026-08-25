import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { DECISION_CATEGORY_LABEL, type DecisionCategory } from "@readrep/domain";
import { getCandidateForReview } from "@/server/dal/review";
import { denyAsMissing } from "@/server/dal/guard";
import { ReviewForm } from "@/components/coach/ReviewForm";
import {
  FilmUnavailable,
  ProvenanceBadge,
  UncertaintyList,
} from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Review" };
export const dynamic = "force-dynamic";

/** Route parameters are user input. Validate before anything reads them. */
const CandidateIdParam = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/);

const OUTCOME_LABEL: Record<string, string> = {
  made_shot: "Made shot",
  missed_shot: "Missed shot",
  assist: "Assist",
  turnover: "Turnover",
  foul_drawn: "Foul drawn",
  offensive_rebound: "Offensive rebound",
  defensive_stop: "Defensive stop",
  reset: "Possession reset",
  unknown: "Not visible",
};

export default async function CandidateReviewPage({
  params,
}: PageProps<"/coach/review/[candidateId]">) {
  const { candidateId } = await params;
  const parsed = CandidateIdParam.safeParse(candidateId);
  if (!parsed.success) notFound();

  const candidate = await denyAsMissing(() =>
    getCandidateForReview(parsed.data as never),
  );
  if (!candidate) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
      <Link href="/coach/review" className="text-chalk-400 hover:text-chalk-50 text-sm">
        ← Review queue
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {candidate.playerName} · {candidate.gameTitle}
          </h1>
          <p className="text-chalk-500 mt-1 text-sm">
            {DECISION_CATEGORY_LABEL[candidate.category as DecisionCategory] ??
              candidate.category}
          </p>
        </div>
        <ProvenanceBadge provenance={candidate.provenance} />
      </div>

      <div className="mt-6">
        <FilmUnavailable
          detail={candidate.film.detail}
          clip={{
            startMs: candidate.evidenceWindow.startMs,
            endMs: candidate.evidenceWindow.endMs,
            pausePointMs: candidate.pausePointMs,
          }}
        />
      </div>

      {/*
        Observed facts and basketball inference are shown side by side, never
        blended. A coach must be able to tell in one glance what the system
        claims to have seen from what it concluded.
      */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5">
          <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
            Observed — what is visible
          </p>
          <ul className="mt-2.5 space-y-2">
            {candidate.observedFacts.map((fact, i) => (
              <li key={i} className="text-chalk-50 text-sm leading-relaxed">
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-ink-700 bg-ink-900 rounded-xl border p-4 sm:p-5">
          <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
            Inferred — basketball reasoning
          </p>
          {candidate.basketballInference.length === 0 ? (
            <p className="text-chalk-500 mt-2.5 text-sm">Nothing inferred.</p>
          ) : (
            <ul className="mt-2.5 space-y-2">
              {candidate.basketballInference.map((line, i) => (
                <li key={i} className="text-chalk-200 text-sm leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Your rules */}
      <div className="border-ink-700 bg-ink-850 mt-3 rounded-xl border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
            Your rules for this situation
          </p>
          {candidate.grounding === "general_reasoning" && (
            <span className="border-quality-suboptimal/40 bg-quality-suboptimal/10 text-quality-suboptimal rounded-full border px-2.5 py-1 text-xs font-medium">
              General basketball reasoning
            </span>
          )}
        </div>
        {candidate.applicableRules.length === 0 ? (
          <p className="text-chalk-400 mt-2.5 text-sm leading-relaxed">
            No rule in your system covers this situation, so this proposal is general
            basketball reasoning rather than your team&apos;s requirement. Approving it
            will present it that way to the player.
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {candidate.applicableRules.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                    rule.cited ? "bg-court-400" : "bg-ink-500"
                  }`}
                />
                <span
                  className={`text-sm leading-relaxed ${
                    rule.cited ? "text-chalk-50" : "text-chalk-500"
                  }`}
                >
                  {rule.statement}
                  {rule.cited && (
                    <span className="text-court-400 ml-2 text-xs">cited</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outcome, kept apart from the read */}
      <div className="border-ink-700 bg-ink-850 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 sm:p-5">
        <div>
          <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
            What happened on the possession
          </p>
          <p className="text-chalk-50 mt-1.5 text-sm">
            {OUTCOME_LABEL[candidate.outcome] ?? candidate.outcome}
          </p>
          {candidate.outcomeNote && (
            <p className="text-chalk-400 mt-1 text-sm leading-relaxed">
              {candidate.outcomeNote}
            </p>
          )}
        </div>
        <p className="text-chalk-500 max-w-xs text-xs leading-relaxed">
          Recorded separately from the read. Judge the decision on what was visible, not
          on the result.
        </p>
      </div>

      <UncertaintyList items={candidate.uncertainty} className="mt-3" />

      <div className="border-ink-700 bg-ink-850 text-chalk-400 mt-3 rounded-xl border p-4 text-sm sm:p-5">
        <span className="text-chalk-200 font-medium">
          Confidence {Math.round(candidate.confidence.score * 100)}% (
          {candidate.confidence.band}).
        </span>{" "}
        {candidate.confidence.basis}
      </div>

      <div className="mt-8">
        <ReviewForm candidate={candidate} />
      </div>
    </div>
  );
}
