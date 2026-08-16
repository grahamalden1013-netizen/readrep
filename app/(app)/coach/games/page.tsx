import { Film } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getTeamGames } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GameRow } from "@/components/ui/game-row";

export default async function GamesPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const games = profile.team_id ? await getTeamGames(profile.team_id) : [];

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title="Games"
        subtitle="Every game uploaded for your team, and how many usable moments ReadRep found in each."
        actions={<LinkButton href="/coach/games/new" size="sm">Upload game</LinkButton>}
      />

      {games.length === 0 ? (
        <EmptyState
          variant="prominent"
          icon={Film}
          title="Turn your next game into a learning session"
          description="Upload a full game and ReadRep will help turn the clearest decision moments into short personalized film assignments."
          action={<LinkButton href="/coach/games/new">Upload your first game</LinkButton>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((game) => (
            <GameRow key={game.id} title={game.title} date={game.created_at} clipCount={game.clipCount} />
          ))}
        </div>
      )}
    </div>
  );
}
