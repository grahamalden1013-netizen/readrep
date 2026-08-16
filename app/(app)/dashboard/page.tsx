import { CheckCircle2, Film, KeyRound, Play } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getAssignedSessions } from "@/lib/sessions/queries";
import { getTeam } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { LinkButton, Button } from "@/components/ui/button";
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

  const incomplete = sessions
    .filter((s) => !s.completed_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const nextSession = incomplete[0];
  const completed = sessions.filter((s) => s.completed_at);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader title={`Hey, ${profile.full_name.split(" ")[0] || "there"}`} subtitle={team?.name} />

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

      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
          Your next film session
        </h2>

        {nextSession ? (
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col gap-5 py-6">
              <div>
                <p className="text-[17px] font-semibold tracking-tight text-foreground">
                  {nextSession.game_title ?? "Untitled session"}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {nextSession.clip_count} {nextSession.clip_count === 1 ? "read" : "reads"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
                    style={{
                      width: `${nextSession.clip_count === 0 ? 0 : Math.round((nextSession.completed_count / nextSession.clip_count) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[12px] tabular-nums text-faint-foreground">
                  {nextSession.completed_count}/{nextSession.clip_count}
                </span>
              </div>

              <LinkButton href={`/sessions/${nextSession.id}`} size="lg" className="self-start">
                <Play className="size-4" aria-hidden="true" />
                {nextSession.completed_count > 0 ? "Continue" : "Start"}
              </LinkButton>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            variant="prominent"
            icon={Film}
            title="No film sessions yet"
            description="Your coach hasn't assigned any film yet. Check back soon, or ask what's coming next."
          />
        )}
      </section>

      {completed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
            Completed sessions
          </h2>
          <ul className="flex flex-col gap-2">
            {completed.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {session.game_title ?? "Untitled session"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {session.clip_count} {session.clip_count === 1 ? "read" : "reads"}
                  </p>
                </div>
                <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
