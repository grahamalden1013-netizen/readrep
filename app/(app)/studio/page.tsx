import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel, SectionLabel } from "@/components/ui/panel";
import { getBackendAvailability } from "@/lib/db";
import { getVideoConfig } from "@/lib/video";
import { listGames, getRepsForGame } from "@/lib/store";
import type { Game } from "@/lib/reps/schema";

// Reads per-request state (signed-in user, stored games), so never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rep studio" };

function statusLabel(game: Game): { text: string; ready: boolean } {
  if (game.origin === "demo") return { text: "Seeded demo film", ready: true };
  const asset = game.videoAsset;
  if (!asset) return { text: "No video", ready: false };
  switch (asset.status) {
    case "ready":
      return { text: "Ready", ready: true };
    case "errored":
      return { text: asset.error ?? "Failed", ready: false };
    case "cancelled":
      return { text: "Cancelled", ready: false };
    case "processing":
      return { text: "Processing", ready: false };
    default:
      return { text: "Waiting for upload", ready: false };
  }
}

export default async function StudioIndexPage() {
  const [games, availability] = await Promise.all([listGames(), getBackendAvailability()]);
  const videoConfig = getVideoConfig();

  const withReps = await Promise.all(
    games.map(async (game) => ({
      game,
      status: statusLabel(game),
      reps: await getRepsForGame(game.id, { includeDrafts: true }),
    })),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>Internal</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Rep studio</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-400">
          Watch a game, mark the moment before a decision, and write the read. Published reps go
          straight into a session a player can take.
        </p>
      </header>

      {videoConfig.kind === "fixture" ? (
        <p className="rounded-panel border border-ink-700 bg-ink-900 px-4 py-3 text-sm leading-relaxed text-ink-300">
          <span className="label-caps mr-2 rounded-sm bg-ink-700 px-2 py-1 text-ink-100">
            Fixture mode
          </span>
          Mux is not configured, so uploads are simulated and every uploaded game plays the
          committed demo film. Authored reps are stored in{" "}
          {availability.kind === "file" ? "a local file" : "Supabase"}.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Games</SectionLabel>
          <ButtonLink href="/games/new" variant="ghost" className="px-0">
            Add a game
          </ButtonLink>
        </div>

        {withReps.length === 0 ? (
          <EmptyState
            title="No games yet"
            body="Upload a game and it shows up here once the video host has finished with it."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {withReps.map(({ game, status, reps }) => {
              const published = reps.filter((rep) => rep.status === "published").length;
              return (
                <Panel
                  as="li"
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-100">{game.title}</p>
                    <p className="text-sm text-ink-500">
                      {game.playedOn} · {game.identity.teamColor} #{game.identity.jerseyNumber} ·{" "}
                      <span className={status.ready ? "text-signal-good" : "text-ink-500"}>
                        {status.text}
                      </span>
                      {reps.length > 0
                        ? ` · ${published} published, ${reps.length - published} draft`
                        : ""}
                    </p>
                  </div>
                  {status.ready ? (
                    <ButtonLink href={`/studio/${game.id}`} variant="secondary">
                      Open
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/games/${game.id}/processing`} variant="ghost">
                      Check status
                    </ButtonLink>
                  )}
                </Panel>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
