import { Film, KeyRound } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getAssignedSessions } from "@/lib/sessions/queries";
import { getTeam } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SessionCard } from "@/components/ui/session-card";
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

  const incomplete = sessions
    .filter((s) => !s.completed_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const nextSession = incomplete[0];
  const completed = sessions.filter((s) => s.completed_at);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title="Ready for your next read?"
        subtitle={
          nextSession
            ? `${nextSession.game_title ?? "A session"} is waiting for you.`
            : team
              ? `You're on ${team.name}.`
              : undefined
        }
      />

      {!profile.team_id && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                <KeyRound className="size-4" aria-hidden="true" />
              </div>
              <h2 className="text-[13.5px] font-medium text-foreground">Join your team</h2>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <form action={joinTeam} className="flex gap-2">
              <Field label="Invite code" className="flex-1">
                {(id) => (
                  <Input id={id} type="text" name="code" placeholder="e.g. A3F9C102" required className="uppercase" />
                )}
              </Field>
              <Button type="submit" className="mt-6">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {nextSession ? (
        <SessionCard
          sessionId={nextSession.id}
          gameTitle={nextSession.game_title}
          readCount={nextSession.clip_count}
          completedCount={nextSession.completed_count}
        />
      ) : (
        <EmptyState
          variant="prominent"
          icon={Film}
          title="Nothing assigned yet"
          description="When your coach sends you a film session, it'll show up here."
        />
      )}

      {completed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
            Completed sessions
          </h2>
          <div className="flex flex-col gap-2">
            {completed.map((session) => (
              <SessionCard
                key={session.id}
                compact
                sessionId={session.id}
                gameTitle={session.game_title}
                readCount={session.clip_count}
                completedCount={session.completed_count}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
