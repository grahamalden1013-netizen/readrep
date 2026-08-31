import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState, SectionLabel } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { RepStudio } from "@/components/studio/rep-studio";
import { PublishedRepActions } from "@/components/studio/published-rep-actions";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { formatTimecode } from "@/lib/reps/timing";
import { getGame, getRepsForGame } from "@/lib/store";
import { getPlayableVideo, getVideoDurationMs } from "@/lib/video/playback";
import { getLatestAiRepJobForGame } from "@/lib/actions/ai-rep";
import { isAiConfigured } from "@/lib/ai/config";

export const metadata: Metadata = { title: "Studio" };

export default async function StudioGamePage({
  params,
  searchParams,
}: PageProps<"/studio/[gameId]">) {
  const { gameId } = await params;
  const query = await searchParams;

  const game = await getGame(gameId);
  if (!game) notFound();

  const source = getPlayableVideo(game);
  if (!source) {
    return (
      <div className="page-shell-narrow flex flex-col gap-8 py-10">
        <PageHeader
          label="Studio"
          title={game.title}
          actions={
            <>
              <ButtonLink href={`/games/${game.id}/processing`}>
                Check status
              </ButtonLink>
              <ButtonLink href="/games" variant="secondary">
                Back to film
              </ButtonLink>
            </>
          }
        >
          This game has no playable video yet, so there is nothing to mark up.
        </PageHeader>
      </div>
    );
  }

  const reps = await getRepsForGame(gameId, { includeDrafts: true });

  // AI Rep Copilot: available only with a ready Mux video and the AI key set.
  const aiEnabled =
    isAiConfigured() &&
    source.kind === "hls" &&
    game.videoAsset?.provider === "mux" &&
    game.videoAsset.status === "ready" &&
    Boolean(game.videoAsset.playbackId);
  const initialAiJob = aiEnabled ? await getLatestAiRepJobForGame(gameId) : null;

  const editingId = typeof query.rep === "string" ? query.rep : null;
  const publishedId =
    typeof query.published === "string" ? query.published : null;
  const existingRep = editingId
    ? (reps.find((rep) => rep.id === editingId) ?? null)
    : null;

  return (
    <div className="page-shell flex flex-col gap-6 py-6">
      <PageHeader
        label="Studio"
        title={game.title}
        meta={
          <>
            {game.identity.teamColor} &middot; #{game.identity.jerseyNumber}
            {game.videoAsset?.durationSeconds
              ? ` · ${formatTimecode(game.videoAsset.durationSeconds * 1000)} of film`
              : ""}
            {` · ${reps.length} ${reps.length === 1 ? "rep" : "reps"} authored`}
          </>
        }
        actions={
          <ButtonLink href="/games" variant="secondary">
            Back to film
          </ButtonLink>
        }
      />

      {publishedId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-accent/50 bg-surface p-4">
          <p className="decision-mark text-sm font-medium text-fg">
            Rep published. It is now playable as a session on this game.
          </p>
          <PublishedRepActions gameId={game.id} />
        </div>
      ) : null}

      <RepStudio
        gameId={game.id}
        gameTitle={game.title}
        source={source}
        durationMs={getVideoDurationMs(game)}
        existingRep={existingRep}
        repCount={reps.length}
        target={{
          jerseyNumber: game.identity.jerseyNumber,
          teamColor: game.identity.teamColor,
          marker: game.identity.marker ?? null,
        }}
        aiEnabled={aiEnabled}
        initialAiJob={initialAiJob}
        aside={
          <section className="flex flex-col gap-3">
            <SectionLabel>Reps on this game</SectionLabel>
            {reps.length === 0 ? (
              <EmptyState
                title="No reps yet"
                body="Scrub to the instant before a decision, set the freeze, and write the read. The first one you publish becomes a playable session."
              />
            ) : (
              <ul className="overflow-hidden rounded-panel border border-line">
                {reps.map((rep) => (
                  <li
                    key={rep.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-fg">
                        {rep.title}
                        <Chip
                          tone={rep.status === "published" ? "good" : "quiet"}
                        >
                          {rep.status}
                        </Chip>
                      </p>
                      <p className="timecode mt-1.5 text-fg-faint">
                        {SKILL_CATEGORY_LABELS[rep.category]} ·{" "}
                        {formatTimecode(rep.clipStartMs)} →{" "}
                        <span className="text-accent">
                          {formatTimecode(rep.decisionPauseMs)}
                        </span>{" "}
                        → {formatTimecode(rep.clipEndMs)}
                      </p>
                    </div>
                    <Link
                      href={`/studio/${game.id}?rep=${rep.id}`}
                      className="rounded-xs text-sm font-medium text-fg underline underline-offset-4"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        }
      />
    </div>
  );
}
