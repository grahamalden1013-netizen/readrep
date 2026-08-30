import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnalysisProgress, type Stage } from "@/components/processing/analysis-progress";
import { VideoStatus } from "@/components/processing/video-status";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
import { getGame, getRepsForGame } from "@/lib/store";

export const metadata: Metadata = { title: "Preparing film" };

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
    <div className="page-shell-narrow flex flex-col gap-8 py-10">
      <PageHeader
        label={isSeededDemo ? "Preparing your session" : "Preparing film"}
        title={game.title}
        meta={
          <>
            {game.identity.teamColor} &middot; #{game.identity.jerseyNumber}
            {game.identity.marker ? ` · ${game.identity.marker}` : ""}
          </>
        }
      />

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
        <EmptyState
          title="No video on this game"
          body={`${game.title} was created without a video. Upload the film again to continue.`}
          action={
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink href="/games/new">Upload film</ButtonLink>
              <ButtonLink href="/games" variant="secondary">
                Back to film
              </ButtonLink>
            </div>
          }
        />
      )}
    </div>
  );
}
