import { ClipboardList } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getRoster } from "@/lib/teams/queries";
import { getTeamAssignments } from "@/lib/sessions/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AssignmentRow } from "@/components/ui/assignment-row";

export default async function AssignmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const roster = profile.team_id ? await getRoster(profile.team_id) : [];
  const assignments = await getTeamAssignments(roster);

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title="Assignments"
        subtitle="Film sessions assigned to your players, and how far along each one is."
      />

      {assignments.length === 0 ? (
        <EmptyState
          variant="prominent"
          icon={ClipboardList}
          title="No assignments yet"
          description="Once you publish clips to a player, their progress will show up here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a) => (
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
    </div>
  );
}
