import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnalysisFlow } from "@/components/analysis/analysis-flow";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { getLatestGameAnalysisForGame } from "@/lib/actions/game-analysis";
import { loadCoachingProfile } from "@/lib/actions/coaching";
import { isProfileComplete } from "@/lib/coaching/profile";
import { getGame } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analysis" };

export default async function AnalysisPage({ params }: PageProps<"/games/[gameId]/analysis">) {
  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) notFound();

  const asset = game.videoAsset;
  const ready = asset && asset.provider === "mux" && asset.status === "ready" && asset.playbackId;

  if (!ready) {
    return (
      <div className="page-shell-narrow flex flex-col gap-8 py-10">
        <PageHeader label="Analysis" title={game.title} />
        <EmptyState
          title="The video isn't ready yet"
          body="Once the upload finishes processing, come back here to analyse the game."
          action={
            <ButtonLink href={`/games/${gameId}/processing`} variant="secondary">
              Check upload status
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const [job, profile] = await Promise.all([
    getLatestGameAnalysisForGame(gameId),
    loadCoachingProfile(),
  ]);

  return (
    <div className="page-shell-narrow flex flex-col gap-8 py-10">
      <PageHeader
        label="Analysis"
        title={game.title}
        meta={
          <>
            {game.identity.teamColor} &middot; #{game.identity.jerseyNumber}
          </>
        }
      >
        Upload a game. Pick a player. NextRep finds the decisions worth replaying.
      </PageHeader>

      <AnalysisFlow
        gameId={gameId}
        defaults={{
          jerseyNumber: game.identity.jerseyNumber,
          teamColor: game.identity.teamColor,
          marker: game.identity.marker ?? null,
        }}
        initialJob={job}
        profileComplete={isProfileComplete(profile)}
      />
    </div>
  );
}
