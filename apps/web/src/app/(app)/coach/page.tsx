import Link from "next/link";
import type { Metadata } from "next";
import { getCoachDashboard, getCoachTeamId } from "@/server/dal/coach";
import { denyAsMissing } from "@/server/dal/guard";
import { Card, DemonstrationNotice, SectionLabel } from "@/components/ui/primitives";
import { QUALITY_LABEL } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

const CONSENT_LABEL: Record<string, string> = {
  film_upload: "Film",
  automated_analysis: "Analysis",
  coach_assignment: "Assignments",
  trainer_access: "Trainer",
  extended_retention: "Retention",
};

export default async function CoachHome() {
  const teamId = await getCoachTeamId();
  if (!teamId) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-xl font-semibold tracking-tight">No team</h1>
        <p className="text-chalk-400 mt-2 text-sm">
          This account does not coach or administer a team.
        </p>
      </div>
    );
  }

  const dashboard = await denyAsMissing(() => getCoachDashboard(teamId));
  if (!dashboard) return null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dashboard.teamName}
        </h1>
        <span className="text-chalk-500 text-sm">{dashboard.season}</span>
      </div>

      {/* Three things a coach needs at a glance. No invented scores. */}
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <SectionLabel>Waiting on you</SectionLabel>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {dashboard.pendingReviewCount}
          </p>
          <Link
            href="/coach/review"
            className="text-court-400 mt-2 inline-block text-sm hover:underline"
          >
            Open review queue →
          </Link>
        </Card>

        <Card className="p-5">
          <SectionLabel>Your system</SectionLabel>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {dashboard.ruleCount}
          </p>
          <p className="text-chalk-400 mt-1 text-sm">
            {dashboard.coachSystemRevision === null
              ? "Not set up yet"
              : `rules · revision ${dashboard.coachSystemRevision}`}
          </p>
          <Link
            href="/coach/system"
            className="text-court-400 mt-2 inline-block text-sm hover:underline"
          >
            {dashboard.coachSystemRevision === null ? "Set it up" : "Review it"} →
          </Link>
        </Card>

        <Card className="p-5">
          <SectionLabel>Roster</SectionLabel>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {dashboard.roster.length}
          </p>
          <p className="text-chalk-400 mt-1 text-sm">players</p>
        </Card>
      </div>

      {/* Roster */}
      <div className="mt-9">
        <SectionLabel>Players</SectionLabel>
        <div className="mt-3 space-y-3">
          {dashboard.roster.map((player) => {
            const attempts = Object.entries(player.attemptQuality);
            const total = attempts.reduce((sum, [, n]) => sum + n, 0);
            return (
              <Card key={player.playerId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold tracking-tight">
                      {player.displayName}
                    </h3>
                    <p className="text-chalk-500 mt-0.5 text-xs">
                      {player.approvedMomentCount} moments ·{" "}
                      {player.assignmentsCompleted}/{player.assignmentsAssigned}{" "}
                      sessions complete
                      {player.revisitRequests > 0 &&
                        ` · ${player.revisitRequests} marked to revisit`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {player.isMinor && (
                      <span className="border-ink-600 bg-ink-800 text-chalk-400 rounded-full border px-2 py-0.5 text-xs">
                        Minor
                      </span>
                    )}
                    {player.grantedConsents.map((scope) => (
                      <span
                        key={scope}
                        title={`Consent granted: ${scope}`}
                        className="border-quality-preferred/30 bg-quality-preferred/10 text-quality-preferred rounded-full border px-2 py-0.5 text-xs"
                      >
                        {CONSENT_LABEL[scope] ?? scope}
                      </span>
                    ))}
                  </div>
                </div>

                {total > 0 ? (
                  <div className="mt-4">
                    <p className="text-chalk-500 text-xs">
                      How their reads have graded across {total}{" "}
                      {total === 1 ? "attempt" : "attempts"}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                      {attempts.map(([quality, count]) => (
                        <li key={quality} className="text-chalk-200 text-sm">
                          <span className="text-chalk-50 font-mono tabular-nums">
                            {count}
                          </span>{" "}
                          <span className="text-chalk-400">
                            {QUALITY_LABEL[quality] ?? quality}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-chalk-500 mt-4 text-sm">No attempts yet.</p>
                )}
              </Card>
            );
          })}
        </div>
        <p className="text-chalk-500 mt-4 text-xs leading-relaxed">
          ReadRep reports what happened and links to the clip. It does not compute a
          single basketball-IQ score, because no defensible definition of one exists
          yet.
        </p>
      </div>

      <div className="mt-10">
        <DemonstrationNotice />
      </div>
    </div>
  );
}
