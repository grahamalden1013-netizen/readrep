import Link from "next/link";
import type { Metadata } from "next";
import { DECISION_CATEGORY_LABEL, type DecisionCategory } from "@readrep/domain";
import { getCoachTeamId } from "@/server/dal/coach";
import { getReviewQueue } from "@/server/dal/review";
import { denyAsMissing } from "@/server/dal/guard";
import { Card, ProvenanceBadge, SectionLabel } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

const timecode = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default async function ReviewQueuePage() {
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

  const queue = (await denyAsMissing(() => getReviewQueue(teamId))) ?? [];
  const pending = queue.filter(
    (q) => q.status === "proposed" || q.status === "in_review",
  );
  const settled = queue.filter(
    (q) => q.status === "approved" || q.status === "rejected",
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Review queue
      </h1>
      <p className="text-chalk-400 mt-1.5 text-sm">
        Nothing reaches a player until you approve it. Highest-value moments first.
      </p>

      <div className="mt-8">
        <SectionLabel>Waiting on you · {pending.length}</SectionLabel>
        {pending.length === 0 ? (
          <p className="text-chalk-400 mt-3 text-sm">Nothing to review.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((item) => (
              <li key={item.candidateId}>
                <Link
                  href={`/coach/review/${item.candidateId}`}
                  className="border-ink-700 bg-ink-850 hover:border-ink-500 block rounded-xl border p-4 transition-colors sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-chalk-50 font-medium">
                        {DECISION_CATEGORY_LABEL[item.category as DecisionCategory] ??
                          item.category}
                      </h3>
                      <p className="text-chalk-500 mt-0.5 text-xs">
                        {item.playerName} · {item.gameTitle} ·{" "}
                        <span className="font-mono">{timecode(item.pausePointMs)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ProvenanceBadge provenance={item.provenance} />
                      {item.uncertaintyCount > 0 && (
                        <span className="border-ink-600 bg-ink-800 text-chalk-400 rounded-full border px-2.5 py-1 text-xs">
                          {item.uncertaintyCount} unclear
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {settled.length > 0 && (
        <div className="mt-9">
          <SectionLabel>Already decided</SectionLabel>
          <ul className="mt-3 space-y-2">
            {settled.map((item) => (
              <li key={item.candidateId}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-chalk-200 text-sm">
                      {DECISION_CATEGORY_LABEL[item.category as DecisionCategory] ??
                        item.category}
                    </p>
                    <p className="text-chalk-500 mt-0.5 text-xs">
                      {item.playerName} ·{" "}
                      <span className="font-mono">{timecode(item.pausePointMs)}</span>
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      item.status === "approved"
                        ? "border-quality-preferred/40 bg-quality-preferred/10 text-quality-preferred"
                        : "border-quality-risk/40 bg-quality-risk/10 text-quality-risk"
                    }`}
                  >
                    {item.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
