import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionLabel } from "@/components/ui/panel";
import { SkillBars } from "@/components/session/skill-bars";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { scoreSession } from "@/lib/reps/scoring";
import { getGame, getRepsByIds, getSession } from "@/lib/store";

export const metadata: Metadata = { title: "Session complete" };

export default async function SessionCompletePage({
  params,
}: PageProps<"/sessions/[sessionId]/complete">) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) {
    notFound();
  }

  const [game, reps] = await Promise.all([
    getGame(session.gameId),
    getRepsByIds(session.repIds),
  ]);
  if (reps.length === 0) {
    notFound();
  }

  const score = scoreSession(reps, session.responses);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>Session complete</SectionLabel>
        <p className="text-5xl font-semibold tracking-tight text-ink-50 tabular-nums">
          {score.correct} <span className="text-ink-600">/</span> {score.total}
        </p>
        <p className="text-sm text-ink-400">
          {game ? `${game.title} · ` : ""}
          {score.answered === score.total
            ? "All five reps answered."
            : `${score.answered} of ${score.total} reps answered.`}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <SectionLabel>Biggest strength</SectionLabel>
          <p className="mt-2 text-sm font-medium text-ink-50">
            {score.strength ? SKILL_CATEGORY_LABELS[score.strength] : "Not enough reps yet"}
          </p>
        </Panel>
        <Panel className="p-5">
          <SectionLabel>Needs work</SectionLabel>
          <p className="mt-2 text-sm font-medium text-ink-50">
            {score.needsWork ? SKILL_CATEGORY_LABELS[score.needsWork] : "Nothing missed"}
          </p>
        </Panel>
        <Panel className="p-5">
          <SectionLabel>Next game focus</SectionLabel>
          <p className="mt-2 text-sm font-medium text-ink-50">
            {score.nextFocus ?? "Keep taking the read you took today."}
          </p>
        </Panel>
      </div>

      <section className="flex flex-col gap-4">
        <SectionLabel>Read accuracy by category</SectionLabel>
        <SkillBars skills={score.skills} />
        <p className="text-xs text-ink-600">
          Accuracy across the reps in this session only. Not a rating.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Every rep</SectionLabel>
        <ol className="flex flex-col gap-2">
          {score.scoredReps.map(({ rep, response }, index) => {
            const correctLabel = rep.choices.find(
              (choice) => choice.id === rep.correctChoiceId,
            )?.label;
            const chosenLabel = response
              ? rep.choices.find((choice) => choice.id === response.choiceId)?.label
              : null;

            return (
              <Panel as="li" key={rep.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-ink-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="label-caps text-ink-400">
                    {SKILL_CATEGORY_LABELS[rep.category]}
                  </span>
                  <span
                    className={`label-caps ml-auto ${
                      !response
                        ? "text-ink-500"
                        : response.isCorrect
                          ? "text-signal-good"
                          : "text-signal-bad"
                    }`}
                  >
                    {!response ? "Skipped" : response.isCorrect ? "Correct" : "Missed"}
                  </span>
                </div>
                <p className="text-sm text-ink-200">{rep.prompt}</p>
                <p className="text-sm text-ink-500">
                  {chosenLabel ? `You chose: ${chosenLabel}. ` : ""}
                  Best read: {correctLabel}.
                </p>
              </Panel>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/dashboard" size="lg">
          Back to dashboard
        </ButtonLink>
        <ButtonLink href="/games/new" variant="secondary" size="lg">
          Upload another game
        </ButtonLink>
      </div>
    </div>
  );
}
