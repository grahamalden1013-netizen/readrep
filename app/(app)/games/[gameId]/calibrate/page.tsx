import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalibrationWorkbench } from "@/components/calibration/calibration-workbench";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/panel";
import { loadCalibration } from "@/lib/actions/calibration";
import { getGame } from "@/lib/store";
import { getPlayableVideo } from "@/lib/video/playback";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calibrate" };

export default async function CalibratePage({ params }: PageProps<"/games/[gameId]/calibrate">) {
  const { gameId } = await params;
  // RLS-scoped read: getGame only returns the game to its owner, so this is the
  // owner-only gate. Anyone else (signed out or another account) gets notFound.
  const game = await getGame(gameId);
  if (!game) notFound();

  const source = getPlayableVideo(game);
  if (!source) {
    return (
      <div className="page-shell-narrow flex flex-col gap-8 py-10">
        <PageHeader label="Calibrate" title={game.title} />
        <EmptyState title="No playable video" body="This game has no film to label against." />
      </div>
    );
  }

  const { references, labels } = await loadCalibration(gameId);

  return (
    <div className="page-shell flex flex-col gap-6 py-6">
      <PageHeader
        label="Calibration (owner only, temporary)"
        title={game.title}
        meta={
          <>
            {game.identity.teamColor} &middot; #{game.identity.jerseyNumber} &middot; gold set: 5 real decisions + 5
            non-decisions
          </>
        }
      >
        Label a small gold set to measure game-analysis-v2 recall and precision. Nothing here is published as a rep.
      </PageHeader>

      <CalibrationWorkbench
        gameId={gameId}
        source={source}
        target={{
          jerseyNumber: game.identity.jerseyNumber,
          teamColor: game.identity.teamColor,
        }}
        initialReferences={references}
        initialLabels={labels}
      />
    </div>
  );
}
