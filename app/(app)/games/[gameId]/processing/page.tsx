import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnalysisProgress, type Stage } from "@/components/processing/analysis-progress";
import { VideoStatus } from "@/components/processing/video-status";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionLabel } from "@/components/ui/panel";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
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
  if (!game) notFound();

  const publishedReps = await getRepsForGame(gameId);
  const isSeededDemo = game.id === DEMO_GAME_ID;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>{isSeededDemo ? "Analyzing game" : "Uploading game"}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">{game.title}</h1>
        <p className="text-sm text-ink-400">
          {game.identity.teamColor} · #{game.identity.jerseyNumber}
          {game.identity.marker ? ` · ${game.identity.marker}` : ""}
        </p>
      </header>

      {isSeededDemo ? (
        <AnalysisProgress
          gameId={game.id}
          stages={stagesFor(game.identity.jerseyNumber)}
          note="This is the seeded demo game. Its five reps were prepared by hand — the stages above show what an analysis pass produces, not work being done right now."
        />
      ) : game.videoAsset ? (
        <VideoStatus
          gameId={game.id}
          hasReps={publishedReps.length > 0}
          initial={{
            status: game.videoAsset.status,
            provider: game.videoAsset.provider,
            error: game.videoAsset.error,
            durationSeconds: game.videoAsset.durationSeconds,
            playbackId: game.videoAsset.playbackId,
          }}
        />
      ) : (
        <Panel className="flex flex-col items-start gap-4 p-6">
          <SectionLabel>No video</SectionLabel>
          <p className="max-w-prose text-sm leading-relaxed text-ink-300">
            {game.title} was created without a video. Upload the film again to continue.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <ButtonLink href="/games/new">Upload a game</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
        </Panel>
      )}
    </div>
  );
}
