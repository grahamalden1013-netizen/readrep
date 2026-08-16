import Link from "next/link";
import { CheckCircle2, Circle, Film, KeyRound } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getAssignedSessions } from "@/lib/sessions/queries";
import { getTeam } from "@/lib/teams/queries";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { joinTeam } from "./actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout already redirects

  const [sessions, team] = await Promise.all([
    getAssignedSessions(),
    profile.team_id ? getTeam(profile.team_id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Your sessions
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {team ? team.name : "You haven't joined a team yet."}
        </p>
      </div>

      {!profile.team_id && (
        <div className="rounded-lg border border-dashed border-border-strong p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
              <KeyRound className="size-4" aria-hidden="true" />
            </div>
            <h2 className="text-[13.5px] font-medium text-foreground">Join your team</h2>
          </div>
          {error && (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          )}
          <form action={joinTeam} className="mt-4 flex gap-2">
            <Field label="Invite code" className="flex-1">
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  name="code"
                  placeholder="e.g. A3F9C102"
                  required
                  className="uppercase"
                />
              )}
            </Field>
            <Button type="submit" className="mt-6">
              Join
            </Button>
          </form>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No film sessions yet"
          description="Once your coach assigns one, it'll show up here."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-border-strong hover:bg-surface-2"
              >
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {session.game_title ?? "Untitled session"}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {session.clip_count} {session.clip_count === 1 ? "clip" : "clips"}
                  </p>
                </div>
                <Badge tone={session.completed_at ? "success" : "neutral"}>
                  {session.completed_at ? (
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                  ) : (
                    <Circle className="size-3" aria-hidden="true" />
                  )}
                  {session.completed_at ? "Completed" : "Not started"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
