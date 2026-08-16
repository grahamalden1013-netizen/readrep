import { Film, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster, getTeam, getTeamGames } from "@/lib/teams/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { InviteCodeCard } from "./invite-code-card";

export default async function CoachPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout already redirects

  const [team, roster, games] = await Promise.all([
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
    profile.team_id ? getRoster(profile.team_id) : Promise.resolve([]),
    profile.team_id ? getTeamGames(profile.team_id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {team?.name ?? "Your team"}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {roster.length} {roster.length === 1 ? "player" : "players"} on the roster
        </p>
      </div>

      {team?.invite_code && <InviteCodeCard code={team.invite_code} />}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          Roster
        </h2>

        {roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No players yet"
            description="Share your invite code and players will show up here as soon as they join."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Player</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-foreground">
                        {player.full_name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      {player.full_name}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
          <Film className="size-3.5" aria-hidden="true" />
          Games
        </h2>

        {games.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No games uploaded yet"
            description="Game and clip creation is coming soon."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Game</TableHeaderCell>
                <TableHeaderCell className="text-right">Added</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.title}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] text-faint-foreground">
                    {new Date(game.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
