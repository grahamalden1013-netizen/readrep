import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel, SectionLabel } from "@/components/ui/panel";
import { GameList, GameRow, gameStatus } from "@/components/app/game-row";
import { SkillBars } from "@/components/session/skill-bars";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { aggregateSkills, scoreSession } from "@/lib/reps/scoring";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
import { getGame, getRepsByIds, listGames, listSessions } from "@/lib/store";

export const metadata: Metadata = { title: "Dashboard" };

const MINUTES_PER_REP = 0.8;
const RECENT_GAMES = 3;

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

  const recent = games.slice(0, RECENT_GAMES);

  return (
    <div className="page-shell flex flex-col gap-10 py-8">
      {/* The one thing this page exists to do. */}
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-line pb-7">
        <div className="min-w-0">
          <p className="label-caps text-fg-faint">Your next session</p>
          <h1 className="display-1 mt-4 text-fg">
            {nextRepCount} {nextRepCount === 1 ? "rep" : "reps"}
          </h1>
          <p className="mt-3 text-sm text-fg-soft">
            {nextGame?.title ?? "Your next game"} &middot; about{" "}
            {Math.max(1, Math.round(nextRepCount * MINUTES_PER_REP))} minutes
          </p>
        </div>

        {inProgress ? (
          <ButtonLink href={`/sessions/${inProgress.session.id}`} size="lg">
            Resume reps
          </ButtonLink>
        ) : (
          <ButtonLink href={`/games/${DEMO_GAME_ID}/processing`} size="lg">
            Start reps
          </ButtonLink>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>Last session</SectionLabel>
          {lastScore && lastCompleted ? (
            <Panel className="flex flex-1 flex-col items-start gap-3 p-5">
              <p className="display-1 text-fg tabular-nums">
                {lastScore.correct}
                <span className="text-fg-faint">/{lastScore.total}</span>
              </p>
              <p className="text-sm text-fg-soft">{lastCompleted.game?.title ?? "Session"}</p>
              <Link
                href={`/sessions/${lastCompleted.session.id}/complete`}
                className="mt-auto rounded-xs text-sm font-medium text-fg underline underline-offset-4"
              >
                See the breakdown
              </Link>
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
            <Panel className="flex flex-1 flex-col gap-4 p-5">
              <p className="decision-mark text-[0.9375rem] leading-relaxed font-medium text-fg">
                {lastScore.nextFocus}
              </p>
              {lastScore.needsWork ? (
                <p className="text-sm text-fg-faint">
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

      <section className="flex flex-col gap-4">
        <SectionLabel>Read accuracy by category</SectionLabel>
        <SkillBars skills={profileSkills} />
        {profileSkills.length > 0 ? (
          <p className="text-xs text-fg-faint">
            Correct reads across every completed session. Not a rating.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>Recent film</SectionLabel>
          <Link
            href="/games"
            className="rounded-xs text-[0.8125rem] font-medium text-fg underline underline-offset-4"
          >
            All film
          </Link>
        </div>
        <GameList>
          {recent.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              status={gameStatus(game)}
              actions={
                <ButtonLink href={`/games/${game.id}/processing`} variant="secondary" size="sm">
                  {game.origin === "demo" ? "Take reps" : "Check status"}
                </ButtonLink>
              }
            />
          ))}
        </GameList>
      </section>
    </div>
  );
}
