import Link from "next/link";
import type { Metadata } from "next";
import { getPlayerHome } from "@/server/dal/player";
import { Card, DemonstrationNotice, SectionLabel } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Your sessions" };
export const dynamic = "force-dynamic";

/**
 * A due date, shown as a soft nudge.
 *
 * Rendered on the server so every player sees the same string; a locale-derived
 * date computed in the browser would differ from the one a coach set and would
 * mismatch between server and client markup.
 */
const formatDue = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function PlayerHome() {
  const home = await getPlayerHome();

  if (!home) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">No player profile</h1>
        <p className="text-chalk-400 mt-2 text-sm leading-relaxed">
          This account is not on a roster as a player. If you coach a team, go to{" "}
          <Link href="/coach" className="text-court-400 underline">
            Team
          </Link>
          .
        </p>
      </div>
    );
  }

  const next = home.assignments.find((a) => a.status !== "completed");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {home.playerName}
        </h1>
        <span className="text-chalk-500 text-sm">{home.teamName}</span>
      </div>

      {next && (
        <Card className="mt-7 overflow-hidden">
          <div className="p-5 sm:p-6">
            <SectionLabel>Next up</SectionLabel>
            <h2 className="mt-2.5 text-lg font-semibold tracking-tight">
              {next.title}
            </h2>
            <p className="text-chalk-400 mt-1 text-sm">
              {next.momentCount} {next.momentCount === 1 ? "rep" : "reps"}
              {next.completedCount > 0 && ` · ${next.completedCount} done`}
              {next.dueAt && ` · due ${formatDue(next.dueAt)}`}
            </p>
            <Link
              href={`/session/${next.id}`}
              className="bg-court-500 text-ink-950 hover:bg-court-400 mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              {next.completedCount > 0 ? "Continue session" : "Start session"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-8">
        <SectionLabel>All sessions</SectionLabel>
        {home.assignments.length === 0 ? (
          <p className="text-chalk-400 mt-3 text-sm">
            Your coach has not assigned any reps yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {home.assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/session/${a.id}`}
                  className="border-ink-700 bg-ink-850 hover:border-ink-500 flex items-center justify-between gap-4 rounded-lg border px-4 py-3.5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-chalk-50 truncate text-sm font-medium">
                      {a.title}
                    </p>
                    <p className="text-chalk-500 mt-0.5 text-xs">
                      {a.completedCount} of {a.momentCount} complete
                      {a.dueAt && ` · due ${formatDue(a.dueAt)}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      a.status === "completed"
                        ? "border-quality-preferred/40 bg-quality-preferred/10 text-quality-preferred"
                        : "border-ink-600 bg-ink-800 text-chalk-400"
                    }`}
                  >
                    {a.status === "completed"
                      ? "Complete"
                      : a.status === "in_progress"
                        ? "In progress"
                        : "Not started"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <DemonstrationNotice />
      </div>
    </div>
  );
}
