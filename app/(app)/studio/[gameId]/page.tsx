import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Panel, SectionLabel } from "@/components/ui/panel";
import { RepStudio } from "@/components/studio/rep-studio";
import { PublishedRepActions } from "@/components/studio/published-rep-actions";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { formatTimecode } from "@/lib/reps/timing";
import { getGame, getRepsForGame } from "@/lib/store";
import { getPlayableVideo, getVideoDurationMs } from "@/lib/video/playback";

export const metadata: Metadata = { title: "Rep studio" };

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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-14 sm:px-6">
        <SectionLabel>Not ready</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">{game.title}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-400">
          This game has no playable video yet, so there is nothing to mark up.
        </p>
        <div className="flex gap-3">
          <ButtonLink href={`/games/${game.id}/processing`}>Check status</ButtonLink>
          <ButtonLink href="/studio" variant="secondary">
            Back to studio
          </ButtonLink>
        </div>
      </div>
    );
  }

  const reps = await getRepsForGame(gameId, { includeDrafts: true });
  const editingId = typeof query.rep === "string" ? query.rep : null;
  const publishedId = typeof query.published === "string" ? query.published : null;
  const existingRep = editingId ? (reps.find((rep) => rep.id === editingId) ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionLabel>Rep studio</SectionLabel>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-50">{game.title}</h1>
          <p className="text-sm text-ink-400">
            {game.identity.teamColor} · #{game.identity.jerseyNumber}
            {game.videoAsset?.durationSeconds
              ? ` · ${formatTimecode(game.videoAsset.durationSeconds * 1000)} of film`
              : ""}
          </p>
        </div>
        <ButtonLink href="/studio" variant="ghost">
          All games
        </ButtonLink>
      </header>

      {publishedId ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3 border-lime-accent/40 p-4">
          <p className="text-sm text-ink-100">
            Rep published. It is now playable as a session on this game.
          </p>
          <PublishedRepActions gameId={game.id} />
        </Panel>
      ) : null}

      <RepStudio
        gameId={game.id}
        gameTitle={game.title}
        source={source}
        durationMs={getVideoDurationMs(game)}
        existingRep={existingRep}
        repCount={reps.length}
      />

      <section className="flex flex-col gap-3">
        <SectionLabel>Reps on this game</SectionLabel>
        {reps.length === 0 ? (
          <p className="text-sm text-ink-500">None yet. Author the first one above.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reps.map((rep) => (
              <Panel
                as="li"
                key={rep.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-ink-100">
                    {rep.title}{" "}
                    <span
                      className={`label-caps ml-2 ${
                        rep.status === "published" ? "text-signal-good" : "text-ink-500"
                      }`}
                    >
                      {rep.status}
                    </span>
                  </p>
                  <p className="font-mono text-xs text-ink-500">
                    {SKILL_CATEGORY_LABELS[rep.category]} · {formatTimecode(rep.clipStartMs)} →{" "}
                    {formatTimecode(rep.decisionPauseMs)} → {formatTimecode(rep.clipEndMs)}
                  </p>
                </div>
                <Link
                  href={`/studio/${game.id}?rep=${rep.id}`}
                  className="text-sm font-medium text-ink-300 underline underline-offset-4 hover:text-ink-50"
                >
                  Edit
                </Link>
              </Panel>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
