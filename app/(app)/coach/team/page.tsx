import { Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster, getTeam } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { InviteCodeCard } from "../invite-code-card";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [team, roster] = await Promise.all([
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
    profile.team_id ? getRoster(profile.team_id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title={team?.name ?? "Your team"}
        subtitle={`${roster.length} ${roster.length === 1 ? "player" : "players"} on the roster`}
      />

      {team?.invite_code && <InviteCodeCard code={team.invite_code} />}

      {roster.length === 0 ? (
        <EmptyState
          variant="prominent"
          icon={Users}
          title="No players yet"
          description="Share your invite code above and players will show up here as soon as they join."
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
    </div>
  );
}
