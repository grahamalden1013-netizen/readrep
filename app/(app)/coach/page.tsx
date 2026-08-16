import { CheckCircle2, ClipboardList, Film, Sparkles, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster, getTeam, getTeamGames } from "@/lib/teams/queries";
import { getTeamAssignments } from "@/lib/sessions/queries";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton, Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ActionCard } from "@/components/ui/action-card";
import { GameRow } from "@/components/ui/game-row";
import { AssignmentRow } from "@/components/ui/assignment-row";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteCodeCard } from "./invite-code-card";

export default async function CoachDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout already redirects

  const [team, roster, games] = await Promise.all([
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
    profile.team_id ? getRoster(profile.team_id) : Promise.resolve([]),
    profile.team_id ? getTeamGames(profile.team_id) : Promise.resolve([]),
  ]);
  const assignments = await getTeamAssignments(roster);

  const activeAssignments = assignments.filter((a) => !a.completedAt).length;
  const firstName = profile.full_name.split(" ")[0] || "Coach";

  const attention: { icon: typeof Users; title: string; description: string; href: string; tone: "warning" | "info" }[] = [];
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

  const subtitle =
    attention.length === 0
      ? "You're all caught up — nothing needs your attention right now."
      : `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention today.`;

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title={`Good afternoon, ${firstName}`}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" size="sm" disabled title="Coming soon">
              Review clips
            </Button>
            <Button variant="secondary" size="sm" disabled title="Coming soon">
              Create assignment
            </Button>
            <Button size="sm" disabled title="Coming soon">
              Upload game
            </Button>
          </>
        }
      />

      {team?.invite_code && <InviteCodeCard code={team.invite_code} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Games" value={games.length} icon={Film} />
        <StatCard label="Players" value={roster.length} icon={Users} />
        <StatCard
          label="Pending reviews"
          value={0}
          hint="No clips need review yet"
          icon={Sparkles}
        />
        <StatCard label="Active assignments" value={activeAssignments} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
              Recent games
            </h2>
            <LinkButton href="/coach/games" variant="ghost" size="sm">
              View all
            </LinkButton>
          </div>

          {games.length === 0 ? (
            <EmptyState
              variant="prominent"
              icon={Film}
              title="No games yet"
              description="Upload a game and ReadRep will turn the best decision moments into short learning assignments."
              action={
                <Button disabled title="Coming soon">
                  Upload your first game
                </Button>
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
            <ActionCard icon={CheckCircle2} title="All caught up" description="Nothing pending right now." tone="neutral" />
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
          <LinkButton href="/coach/assignments" variant="ghost" size="sm">
            View all
          </LinkButton>
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
