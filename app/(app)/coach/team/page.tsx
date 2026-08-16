import { Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster, getTeam } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCard } from "@/components/ui/team-card";
import { PlayerRow } from "@/components/ui/player-row";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [team, roster] = await Promise.all([
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
    profile.team_id ? getRoster(profile.team_id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader title={team?.name ?? "Your team"} subtitle="Your roster and invite code." />

      {team && <TeamCard name={team.name} playerCount={roster.length} inviteCode={team.invite_code ?? ""} />}

      {roster.length === 0 ? (
        <EmptyState
          variant="prominent"
          icon={Users}
          title="No players yet"
          description="Share your invite code above and players will show up here as soon as they join."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {roster.map((player) => (
            <PlayerRow key={player.id} name={player.full_name} />
          ))}
        </div>
      )}
    </div>
  );
}
