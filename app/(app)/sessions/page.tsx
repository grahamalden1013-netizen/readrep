import { redirect } from "next/navigation";
import { Film } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getAssignedSessions } from "@/lib/sessions/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionCard } from "@/components/ui/session-card";

export default async function SessionsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout already redirects

  if (profile.role === "coach") {
    redirect("/coach/assignments");
  }

  const sessions = await getAssignedSessions();
  const inProgress = sessions.filter((s) => !s.completed_at);
  const completed = sessions.filter((s) => s.completed_at);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div className="rr-animate-in">
        <PageHeader title="Sessions" subtitle="Every film session your coach has sent you." />
      </div>

      {sessions.length === 0 ? (
        <div className="rr-animate-in rr-delay-1">
          <EmptyState
            variant="prominent"
            icon={Film}
            title="Nothing assigned yet"
            description="When your coach sends you a film session, it'll show up here."
          />
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="rr-animate-in rr-delay-1 flex flex-col gap-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
                Up next
              </h2>
              <div className="flex flex-col gap-2">
                {inProgress.map((session) => (
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

          {completed.length > 0 && (
            <section className="rr-animate-in rr-delay-2 flex flex-col gap-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
                Completed
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
        </>
      )}
    </div>
  );
}
