"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCoachSystemAction } from "@/app/(app)/coach/system/actions";

export type SurveyQuestion = {
  id: string;
  topic: string;
  topicLabel: string;
  prompt: string;
  help?: string;
  followUpPrompt: string;
  options: { value: string; label: string; statement: string }[];
};

type Answer = { value: string; followUp: string };

/**
 * The coach-system survey.
 *
 * Sixteen questions, one screen, no wizard. A coach who abandons a long form
 * halfway leaves ReadRep with no rules to cite, and ungrounded advice is worse
 * than no advice — so the whole thing is visible, partial answers are allowed,
 * and follow-up detail is optional everywhere.
 */
export function SystemSurvey({
  questions,
  initialAnswers,
  initialSummary,
  currentRevision,
}: {
  questions: SurveyQuestion[];
  initialAnswers: Record<string, { value: string; followUp: string | null }>;
  initialSummary: string | null;
  currentRevision: number | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(
      Object.entries(initialAnswers).map(([id, a]) => [
        id,
        { value: a.value, followUp: a.followUp ?? "" },
      ]),
    ),
  );
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [openFollowUp, setOpenFollowUp] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ revision: number; ruleCount: number } | null>(
    null,
  );

  const answeredCount = Object.keys(answers).length;

  const save = async () => {
    setPending(true);
    setError(null);
    const result = await saveCoachSystemAction({
      summary: summary.trim() || undefined,
      answers: Object.entries(answers).map(([questionId, a]) => ({
        questionId,
        value: a.value,
        followUp: a.followUp.trim() || undefined,
      })),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved({ revision: result.revision, ruleCount: result.ruleCount });
    router.refresh();
  };

  const grouped = questions.reduce<Record<string, SurveyQuestion[]>>((acc, q) => {
    (acc[q.topicLabel] ??= []).push(q);
    return acc;
  }, {});

  return (
    <div>
      <div className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5">
        <label
          htmlFor="system-summary"
          className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
        >
          How does your team play?
        </label>
        <textarea
          id="system-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A few sentences in your own words. Optional."
          className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-2 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
        />
      </div>

      <div className="mt-6 space-y-8">
        {Object.entries(grouped).map(([topicLabel, topicQuestions]) => (
          <section key={topicLabel}>
            <h2 className="text-court-400 text-xs font-semibold uppercase tracking-[0.08em]">
              {topicLabel}
            </h2>
            <div className="mt-3 space-y-4">
              {topicQuestions.map((question) => {
                const answer = answers[question.id];
                return (
                  <fieldset
                    key={question.id}
                    className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5"
                  >
                    <legend className="text-chalk-50 px-1 text-sm font-medium">
                      {question.prompt}
                    </legend>
                    {question.help && (
                      <p className="text-chalk-500 mt-1 text-xs leading-relaxed">
                        {question.help}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.options.map((option) => {
                        const selected = answer?.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            title={option.statement}
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [question.id]: {
                                  value: option.value,
                                  followUp: prev[question.id]?.followUp ?? "",
                                },
                              }))
                            }
                            className={`rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                              selected
                                ? "border-court-500 bg-court-500/10 text-chalk-50"
                                : "border-ink-600 bg-ink-800 text-chalk-200 hover:border-ink-500"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {answer && (
                      <div className="mt-3">
                        <p className="text-chalk-500 text-xs leading-relaxed">
                          Becomes the rule:{" "}
                          <span className="text-chalk-200">
                            “
                            {
                              question.options.find((o) => o.value === answer.value)
                                ?.statement
                            }
                            ”
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenFollowUp((v) =>
                              v === question.id ? null : question.id,
                            )
                          }
                          aria-expanded={openFollowUp === question.id}
                          className="text-chalk-400 hover:text-chalk-50 mt-2 text-xs"
                        >
                          {openFollowUp === question.id ? "Hide" : "Add"} detail
                        </button>
                        {openFollowUp === question.id && (
                          <textarea
                            rows={2}
                            value={answer.followUp}
                            aria-label={question.followUpPrompt}
                            placeholder={question.followUpPrompt}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [question.id]: {
                                  value: answer.value,
                                  followUp: e.target.value,
                                },
                              }))
                            }
                            className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-2 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                          />
                        )}
                      </div>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-quality-risk mt-5 text-sm">
          {error}
        </p>
      )}
      {saved && (
        <p aria-live="polite" className="text-quality-preferred mt-5 text-sm">
          Saved as revision {saved.revision} with {saved.ruleCount} citable rules.
          Earlier revisions are kept, so moments approved against them still cite the
          wording that was in force.
        </p>
      )}

      <div className="border-ink-800 bg-ink-900/95 sticky bottom-0 -mx-5 mt-8 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 backdrop-blur">
        <p className="text-chalk-400 text-sm">
          {answeredCount} of {questions.length} answered
          {currentRevision !== null && ` · currently on revision ${currentRevision}`}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || answeredCount === 0}
          className="bg-court-500 text-ink-950 hover:bg-court-400 disabled:bg-ink-700 disabled:text-chalk-500 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {pending
            ? "Saving…"
            : currentRevision === null
              ? "Save my system"
              : `Save as revision ${currentRevision + 1}`}
        </button>
      </div>
    </div>
  );
}
