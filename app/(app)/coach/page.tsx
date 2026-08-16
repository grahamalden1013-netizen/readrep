import { CheckCircle2, ClipboardList, Film, Sparkles, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster, getTeam, getTeamGames } from "@/lib/teams/queries";
import { getTeamAssignments } from "@/lib/sessions/queries";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ActionCard } from "@/components/ui/action-card";
import { GameRow } from "@/components/ui/game-row";
import { AssignmentRow } from "@/components/ui/assignment-row";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCard } from "@/components/ui/team-card";

export default async function CoachDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout already redirects

  const [team, roster, games] = await Promise.all([
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
    profile.team_id ? getRoster(profile.team_id) : Promise.resolve([]),
    profile.team_id ? getTeamGames(profile.team_id) : Promise.resolve([]),
  ]);
  const assignments = await getTeamAssignments(roster);

  const activeAssignments = assignments.filter((a) => !a.completedAt);
  const firstName = profile.full_name.split(" ")[0] || "Coach";

  const attention: {
    icon: typeof Users;
    title: string;
    description: string;
    href: string;
    tone: "warning" | "info";
  }[] = [];

  if (roster.length === 0) {
    attention.push({
      icon: Users,
      title: "No players on your roster",
      description: "Share your invite code to get your team set up.",
      href: "/coach/team",
      tone: "warning",
    });
  }
  if (games.length === 0) {
    attention.push({
      icon: Film,
      title: "No games uploaded yet",
      description: "Upload film to start building learning assignments.",
      href: "/coach/games",
      tone: "info",
    });
  }
  for (const a of activeAssignments.slice(0, 2)) {
    attention.push({
      icon: ClipboardList,
      title: `${a.playerName} hasn't finished their assignment`,
      description: `${a.completedCount} of ${a.readCount} reads done.`,
      href: "/coach/assignments",
      tone: "info",
    });
  }

  const subtitle =
    attention.length === 0
      ? "You're all caught up — nothing needs your attention right now."
      : "Here's what needs your attention today.";

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title={`Good afternoon, ${firstName}`}
        subtitle={subtitle}
        actions={
          profile.team_id ? (
            <LinkButton href="/coach/games/new" size="sm">
              Upload game
            </LinkButton>
          ) : undefined
        }
      />

      {team && profile.team_id && (
        <TeamCard name={team.name} playerCount={roster.length} inviteCode={team.invite_code ?? ""} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Games" value={games.length} hint={team ? team.name : undefined} icon={Film} />
        <StatCard
          label="Players"
          value={roster.length}
          hint={roster.length === 0 ? "Invite your first player" : team?.name}
          icon={Users}
        />
        <StatCard
          label="Pending reviews"
          value={0}
          hint="No clips waiting — you're caught up"
          icon={Sparkles}
        />
        <StatCard
          label="Active assignments"
          value={activeAssignments.length}
          hint={activeAssignments.length === 0 ? "Nothing in progress" : "In progress"}
          icon={ClipboardList}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
              Recent games
            </h2>
            {games.length > 0 && (
              <LinkButton href="/coach/games" variant="ghost" size="sm">
                View all
              </LinkButton>
            )}
          </div>

          {games.length === 0 ? (
            <EmptyState
              variant="prominent"
              icon={Film}
              title="Turn your next game into a learning session"
              description="Upload a full game and ReadRep will help turn the clearest decision moments into short personalized film assignments."
              action={
                profile.team_id ? (
                  <LinkButton href="/coach/games/new">Upload your first game</LinkButton>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {games.slice(0, 5).map((game) => (
                <GameRow
                  key={game.id}
                  title={game.title}
                  date={game.created_at}
                  clipCount={game.clipCount}
                />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
            Needs attention
          </h2>
          {attention.length === 0 ? (
            <ActionCard
              icon={CheckCircle2}
              title="You're all caught up"
              description="No clips or assignments need your attention."
              tone="neutral"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {attention.map((item) => (
                <ActionCard key={item.title} {...item} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
            Recent assignments
          </h2>
          {assignments.length > 0 && (
            <LinkButton href="/coach/assignments" variant="ghost" size="sm">
              View all
            </LinkButton>
          )}
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Once you publish clips to a player, their progress will show up here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.slice(0, 5).map((a) => (
              <AssignmentRow
                key={a.id}
                playerName={a.playerName}
                gameTitle={a.gameTitle}
                readCount={a.readCount}
                completedCount={a.completedCount}
                status={a.completedAt ? "completed" : a.completedCount > 0 ? "in_progress" : "not_started"}
                assignedDate={a.createdAt}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
