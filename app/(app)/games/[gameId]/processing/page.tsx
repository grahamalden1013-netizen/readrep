import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnalysisProgress, type Stage } from "@/components/processing/analysis-progress";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionLabel } from "@/components/ui/panel";
import { getGame, getRepsForGame } from "@/lib/store";

export const metadata: Metadata = { title: "Analyzing" };

function stagesFor(jerseyNumber: string): Stage[] {
  return [
    { id: "prepare", label: "Preparing video", durationMs: 1100 },
    { id: "locate", label: `Locating player #${jerseyNumber}`, durationMs: 1500 },
    { id: "possessions", label: "Reviewing possessions", durationMs: 1600 },
    { id: "moments", label: "Selecting decision moments", durationMs: 1400 },
    { id: "reps", label: "Building five reps", durationMs: 1200 },
  ];
}

export default async function ProcessingPage({ params }: PageProps<"/games/[gameId]/processing">) {
  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) {
    notFound();
  }

  const reps = await getRepsForGame(gameId);
  const hasReps = reps.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>{hasReps ? "Analyzing game" : "Game saved"}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">{game.title}</h1>
        <p className="text-sm text-ink-400">
          {game.identity.teamColor} · #{game.identity.jerseyNumber}
          {game.identity.marker ? ` · ${game.identity.marker}` : ""}
        </p>
      </header>

      {hasReps ? (
        <AnalysisProgress
          gameId={game.id}
          stages={stagesFor(game.identity.jerseyNumber)}
          note="This is the seeded demo game. Its five reps were prepared by hand — the stages above show what an analysis pass produces, not work being done right now."
        />
      ) : (
        <Panel className="flex flex-col items-start gap-4 p-6">
          <SectionLabel>Review required</SectionLabel>
          <p className="max-w-prose text-sm leading-relaxed text-ink-300">
            {game.title} is saved with your player identity. NextRep does not yet detect decision
            moments automatically, so a coach has to mark this game&apos;s reps before you can take
            a session on it.
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-ink-500">
            In the meantime the demo game is a complete five-rep session you can take right now.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <ButtonLink href="/games/demo-dragons/processing">Take the demo session</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
        </Panel>
      )}
    </div>
  );
}
