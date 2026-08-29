import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel, SectionLabel } from "@/components/ui/panel";
import { SkillBars } from "@/components/session/skill-bars";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { aggregateSkills, scoreSession } from "@/lib/reps/scoring";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
import { getGame, getRepsByIds, listGames, listSessions } from "@/lib/store";

export const metadata: Metadata = { title: "Dashboard" };

const MINUTES_PER_REP = 0.8;

export default async function DashboardPage() {
  const [games, sessions] = await Promise.all([listGames(), listSessions()]);

  const scored = await Promise.all(
    sessions.map(async (session) => ({
      session,
      reps: await getRepsByIds(session.repIds),
      game: await getGame(session.gameId),
    })),
  );

  const inProgress = scored.find(({ session }) => !session.completedAt);
  const completed = scored.filter(({ session }) => session.completedAt);
  const lastCompleted = completed[0] ?? null;
  const lastScore = lastCompleted
    ? scoreSession(lastCompleted.reps, lastCompleted.session.responses)
    : null;

  const demoGame = await getGame(DEMO_GAME_ID);
  const nextGame = inProgress?.game ?? demoGame;
  const nextRepCount = inProgress
    ? inProgress.reps.length - inProgress.session.responses.length
    : 5;

  const profileSkills = aggregateSkills(
    completed.map(({ reps, session }) => ({ reps, session })),
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
      <Panel className="flex flex-col gap-5 p-6 sm:p-8">
        <SectionLabel>Your next session</SectionLabel>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
            {nextRepCount} {nextRepCount === 1 ? "rep" : "reps"} from{" "}
            {nextGame?.title ?? "your next game"}
          </p>
          <p className="text-sm text-ink-400">
            Estimated time: {Math.max(1, Math.round(nextRepCount * MINUTES_PER_REP))} minutes
          </p>
        </div>
        <div>
          {inProgress ? (
            <ButtonLink href={`/sessions/${inProgress.session.id}`} size="lg">
              Resume reps
            </ButtonLink>
          ) : (
            <ButtonLink href={`/games/${DEMO_GAME_ID}/processing`} size="lg">
              Start reps
            </ButtonLink>
          )}
        </div>
      </Panel>

      <div className="grid gap-8 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>Last session</SectionLabel>
          {lastScore && lastCompleted ? (
            <Panel className="flex flex-col gap-2 p-5">
              <p className="text-3xl font-semibold tracking-tight text-ink-50 tabular-nums">
                {lastScore.correct} <span className="text-ink-600">/</span> {lastScore.total}
              </p>
              <p className="text-sm text-ink-400">{lastCompleted.game?.title ?? "Session"}</p>
              <ButtonLink
                href={`/sessions/${lastCompleted.session.id}/complete`}
                variant="ghost"
                className="self-start px-0"
              >
                See the breakdown
              </ButtonLink>
            </Panel>
          ) : (
            <EmptyState
              title="No sessions yet"
              body="Your score and the reps you missed show up here after your first session."
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionLabel>Next game focus</SectionLabel>
          {lastScore?.nextFocus ? (
            <Panel className="p-5">
              <p className="border-l-2 border-lime-accent pl-3 text-sm leading-relaxed font-medium text-ink-50">
                {lastScore.nextFocus}
              </p>
              {lastScore.needsWork ? (
                <p className="mt-3 text-sm text-ink-500">
                  Weakest category: {SKILL_CATEGORY_LABELS[lastScore.needsWork]}
                </p>
              ) : null}
            </Panel>
          ) : (
            <EmptyState
              title="Nothing to work on yet"
              body="After a session, the one cue worth taking into your next game lands here."
            />
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel>Read accuracy by category</SectionLabel>
        <SkillBars skills={profileSkills} />
        {profileSkills.length > 0 ? (
          <p className="text-xs text-ink-600">
            Correct reads across every completed session. Not a rating.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Recent games</SectionLabel>
          <ButtonLink href="/games/new" variant="ghost" className="px-0">
            Add a game
          </ButtonLink>
        </div>
        <ul className="flex flex-col gap-2">
          {games.map((game) => (
            <Panel
              as="li"
              key={game.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium text-ink-100">{game.title}</p>
                <p className="text-sm text-ink-500">
                  {game.playedOn} · {game.identity.teamColor} #{game.identity.jerseyNumber}
                </p>
              </div>
              <ButtonLink href={`/games/${game.id}/processing`} variant="secondary">
                {game.origin === "demo" ? "Take reps" : "Check status"}
              </ButtonLink>
            </Panel>
          ))}
        </ul>
      </section>
    </div>
  );
}
