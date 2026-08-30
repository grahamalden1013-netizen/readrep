import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SectionLabel } from "@/components/ui/panel";
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
    <div className="page-shell flex flex-col gap-9 py-8">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-line pb-7">
        <div>
          <p className="label-caps text-fg-faint">Session complete</p>
          <h1 className="display-1 mt-4 text-fg tabular-nums">
            {score.correct}
            <span className="text-fg-faint">/{score.total}</span>
          </h1>
          <p className="mt-3 text-sm text-fg-soft">
            {game ? `${game.title} · ` : ""}
            {score.answered === score.total
              ? `All ${score.total} reps answered.`
              : `${score.answered} of ${score.total} reps answered.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href="/dashboard" size="lg">
            Back to dashboard
          </ButtonLink>
          <ButtonLink href="/games/new" variant="secondary" size="lg">
            Upload another game
          </ButtonLink>
        </div>
      </header>

      <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
        <div className="bg-surface p-5">
          <SectionLabel>Biggest strength</SectionLabel>
          <p className="mt-2.5 text-sm leading-relaxed font-medium text-fg">
            {score.strength
              ? SKILL_CATEGORY_LABELS[score.strength]
              : "Not enough reps yet"}
          </p>
        </div>
        <div className="bg-surface p-5">
          <SectionLabel>Needs work</SectionLabel>
          <p className="mt-2.5 text-sm leading-relaxed font-medium text-fg">
            {score.needsWork
              ? SKILL_CATEGORY_LABELS[score.needsWork]
              : "Nothing missed"}
          </p>
        </div>
        <div className="bg-surface p-5">
          <SectionLabel>Next game focus</SectionLabel>
          <p className="decision-mark mt-2.5 text-sm leading-relaxed font-medium text-fg">
            {score.nextFocus ?? "Keep taking the read you took today."}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <SectionLabel>Read accuracy by category</SectionLabel>
        <SkillBars skills={score.skills} />
        <p className="text-xs text-fg-faint">
          Accuracy across the reps in this session only. Not a rating.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Every rep</SectionLabel>
        <ol className="overflow-hidden rounded-panel border border-line">
          {score.scoredReps.map(({ rep, response }, index) => {
            const correctLabel = rep.choices.find(
              (choice) => choice.id === rep.correctChoiceId,
            )?.label;
            const chosenLabel = response
              ? rep.choices.find((choice) => choice.id === response.choiceId)
                  ?.label
              : null;

            return (
              <li
                key={rep.id}
                className="flex flex-col gap-2.5 border-b border-line bg-surface px-4 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="timecode text-fg-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="label-caps text-fg-faint">
                    {SKILL_CATEGORY_LABELS[rep.category]}
                  </span>
                  <span className="ml-auto">
                    <Chip
                      tone={
                        !response
                          ? "quiet"
                          : response.isCorrect
                            ? "good"
                            : "bad"
                      }
                    >
                      {!response
                        ? "Skipped"
                        : response.isCorrect
                          ? "Correct"
                          : "Missed"}
                    </Chip>
                  </span>
                </div>
                <p className="text-sm leading-relaxed font-medium text-fg">
                  {rep.prompt}
                </p>
                <p className="text-sm leading-relaxed text-fg-soft">
                  {chosenLabel ? `You chose: ${chosenLabel}. ` : ""}
                  Best read: {correctLabel}.
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
