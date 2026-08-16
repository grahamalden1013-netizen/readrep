import { KeyRound } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getAssignedSessions } from "@/lib/sessions/queries";
import { getTeam } from "@/lib/teams/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SessionCard } from "@/components/ui/session-card";
import { HowItWorks } from "@/components/ui/how-it-works";
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
  const firstName = profile.full_name.split(" ")[0] || "there";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div className="rr-animate-in">
        <PageHeader
          title={nextSession ? "Ready to work?" : `Hey, ${firstName}`}
          subtitle={team?.name}
        />
      </div>

      {!profile.team_id && (
        <Card className="rr-animate-in rr-delay-1 border-dashed">
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
        <div className="rr-animate-in rr-delay-1">
          <SessionCard
            sessionId={nextSession.id}
            gameTitle={nextSession.game_title}
            readCount={nextSession.clip_count}
            completedCount={nextSession.completed_count}
          />
        </div>
      ) : (
        <div className="rr-animate-in rr-delay-1 flex flex-col gap-8">
          <div className="rounded-xl border border-border bg-surface px-6 py-8 sm:px-8">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 1L9 5L1 9Z" fill="var(--primary)" />
              </svg>
              You&apos;re caught up
            </p>
            <h2 className="mt-2.5 text-[22px] font-semibold tracking-tight text-foreground">
              Nothing assigned right now
            </h2>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              When your coach sends your next film session, you&apos;ll get a few
              decision reads pulled directly from game film.
            </p>
          </div>
          <div className="rr-animate-in rr-delay-2">
            <HowItWorks />
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <section className="rr-animate-in rr-delay-2 flex flex-col gap-3">
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
