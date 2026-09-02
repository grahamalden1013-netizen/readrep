import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { GameList, GameRow, gameStatus } from "@/components/app/game-row";
import { getBackendAvailability } from "@/lib/db";
import { getVideoConfig } from "@/lib/video";
import { getRepsForGame, listGames } from "@/lib/store";
import { getReviewInfoForGame } from "@/lib/actions/game-analysis";

// Reads per-request state (signed-in user, stored games), so never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Film" };

export default async function GamesPage() {
  const [games, availability] = await Promise.all([listGames(), getBackendAvailability()]);
  const videoConfig = getVideoConfig();

  const rows = await Promise.all(
    games.map(async (game) => {
      const reps = await getRepsForGame(game.id, { includeDrafts: true });
      const published = reps.filter((rep) => rep.status === "published").length;
      const review = game.origin === "demo" ? null : await getReviewInfoForGame(game.id);
      return { game, status: gameStatus(game), published, drafts: reps.length - published, review };
    }),
  );

  return (
    <div className="page-shell flex flex-col gap-8 py-8">
      {/* No upload button here: the app header carries it on every route. */}
      <PageHeader label="Film" title="Your game film">
        Every game you have uploaded, what the video host has done with it, and how many reps have
        been written against it.
      </PageHeader>

      {videoConfig.kind === "fixture" ? (
        <p className="rounded-panel border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-fg-soft">
          <span className="label-caps mr-2 inline-flex rounded-xs bg-raised px-2 py-1 text-fg">
            Fixture mode
          </span>
          Mux is not configured, so uploads are simulated and every uploaded game plays the
          committed demo film. Authored reps are stored in{" "}
          {availability.kind === "file" ? "a local file" : "Supabase"}.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No film yet"
          body="Upload a game and it lands here once the video host has finished with it."
          action={<ButtonLink href="/games/new">Upload film</ButtonLink>}
        />
      ) : (
        <GameList>
          {rows.map(({ game, status, published, drafts, review }) => (
            <GameRow
              key={game.id}
              game={game}
              status={status}
              repCount={published}
              draftCount={drafts}
              actions={
                <>
                  {review && review.total > 0 ? (
                    <ButtonLink href={`/games/${game.id}/review`} size="sm">
                      {review.toReview > 0
                        ? `Review ${review.toReview} rep${review.toReview === 1 ? "" : "s"}`
                        : `Reviewed · ${review.approved} approved`}
                    </ButtonLink>
                  ) : status.ready ? (
                    <ButtonLink href={`/games/${game.id}/analysis`} size="sm">
                      Analyze
                    </ButtonLink>
                  ) : (
                    <ButtonLink
                      href={`/games/${game.id}/processing`}
                      variant="secondary"
                      size="sm"
                    >
                      Check status
                    </ButtonLink>
                  )}
                  {review && review.total > 0 && status.ready ? (
                    <ButtonLink href={`/games/${game.id}/analysis`} variant="ghost" size="sm">
                      Analyze
                    </ButtonLink>
                  ) : null}
                  {published > 0 ? (
                    <ButtonLink href={`/games/${game.id}/processing`} variant="secondary" size="sm">
                      Take reps
                    </ButtonLink>
                  ) : null}
                  {status.ready ? (
                    <ButtonLink href={`/games/${game.id}/advanced`} variant="ghost" size="sm">
                      Studio
                    </ButtonLink>
                  ) : null}
                </>
              }
            />
          ))}
        </GameList>
      )}
    </div>
  );
}
