import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReviewQueue } from "@/components/review/review-queue";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { listCandidatesForReview } from "@/lib/actions/candidates";
import { getLatestGameAnalysisForGame } from "@/lib/actions/game-analysis";
import { getGame } from "@/lib/store";
import { getPlayableVideo } from "@/lib/video/playback";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review moments" };

export default async function ReviewPage({ params }: PageProps<"/games/[gameId]/review">) {
  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) notFound();

  const source = getPlayableVideo(game);
  const job = await getLatestGameAnalysisForGame(gameId);

  if (!job || job.status !== "completed" || !source) {
    return (
      <div className="page-shell-narrow flex flex-col gap-8 py-10">
        <PageHeader label="Review" title={game.title} />
        <EmptyState
          title="No analysis to review yet"
          body="Run an analysis on this game first, then come back to review the moments it finds."
          action={
            <ButtonLink href={`/games/${gameId}/analysis`} variant="secondary">
              Go to analysis
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const list = await listCandidatesForReview(job.jobId);
  if (!list.ok) {
    return (
      <div className="page-shell-narrow flex flex-col gap-8 py-10">
        <PageHeader label="Review" title={game.title} />
        <EmptyState title="Could not load the moments" body={list.error} />
      </div>
    );
  }

  return (
    <div className="page-shell flex flex-col gap-8 py-8">
      <PageHeader
        label="Review"
        title={game.title}
        meta={
          <>
            {job.target.teamColor} &middot; #{job.target.jerseyNumber}
          </>
        }
      >
        One moment at a time. Keep the useful ones, then hand your player a session.
      </PageHeader>

      <ReviewQueue
        jobId={job.jobId}
        gameId={gameId}
        source={source}
        initialCandidates={list.data.candidates}
        initialApproved={list.data.approved}
        initialSummary={list.data.summary}
      />
    </div>
  );
}
