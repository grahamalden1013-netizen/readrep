"use client";

import { useState, useTransition } from "react";

import { planMyDay, setSessionStatus } from "@/app/(app)/dashboard/actions";
import { TypeBadge } from "@/components/assignment/type-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatMinutes, formatTime, formatTimeRange } from "@/lib/format";
import type { PlanBlock } from "@/lib/queries/dashboard";

/**
 * "Plan My Day": builds a chronological plan from real free time and shows it
 * here only. Nothing is written to Google Calendar.
 */
export function DayPlan({
  plan,
  timezone,
  breakMinutes,
}: {
  plan: PlanBlock[];
  timezone: string;
  breakMinutes: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await planMyDay();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { blocks, scheduledMinutes, freeMinutes, deferred, isLightDay } =
        result.data;
      if (blocks === 0) {
        setMessage(
          freeMinutes === 0
            ? "No free time left in today's homework window."
            : "Nothing to schedule — you're all caught up.",
        );
        return;
      }
      setMessage(
        `${blocks} block${blocks === 1 ? "" : "s"} · ${formatMinutes(
          scheduledMinutes,
        )} of ${formatMinutes(freeMinutes)} free${
          isLightDay ? " · light day" : ""
        }${deferred > 0 ? ` · ${deferred} pushed to another day` : ""}`,
      );
    });
  }

  function updateSession(sessionId: string, status: "COMPLETED" | "PLANNED") {
    startTransition(async () => {
      const result = await setSessionStatus({ sessionId, status });
      if (!result.ok) setError(result.error);
    });
  }

  const totalMinutes = plan.reduce((sum, block) => sum + block.minutes, 0);

  return (
    <Card>
      <CardHeader
        title="Tonight's plan"
        description={
          plan.length > 0
            ? `${plan.length} block${plan.length === 1 ? "" : "s"} · ${formatMinutes(totalMinutes)}`
            : "Build a plan around the free time you actually have."
        }
        action={
          <Button onClick={generate} disabled={pending} size="sm">
            {pending ? "Planning…" : plan.length > 0 ? "Re-plan" : "Plan My Day"}
          </Button>
        }
      />
      <CardBody>
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-3 text-sm text-muted">{message}</p>
        ) : null}

        {plan.length === 0 ? (
          <p className="text-sm text-muted">
            No plan yet. Press <strong>Plan My Day</strong> and your assignments
            will be laid out in the gaps between your calendar events.
          </p>
        ) : (
          <ol className="space-y-2">
            {plan.map((block, index) => {
              const previous = plan[index - 1];
              const gap = previous
                ? Math.round(
                    (block.startAt.getTime() - previous.endAt.getTime()) / 60_000,
                  )
                : 0;

              // Only a gap the planner itself inserted is a break. A longer
              // one is a calendar event, and calling that a "break" would be
              // a lie — the schedule card already shows what it is.
              const isPlannedBreak =
                gap > 0 && breakMinutes > 0 && gap <= breakMinutes;

              return (
                <li key={block.id}>
                  {isPlannedBreak ? (
                    <p className="py-1 pl-1 text-xs text-muted">
                      {gap} min break
                    </p>
                  ) : gap > breakMinutes ? (
                    <p className="py-1 pl-1 text-xs text-muted">
                      Busy until {formatTime(block.startAt, timezone)}
                    </p>
                  ) : null}

                  <div
                    className={`flex items-start gap-3 rounded-lg border border-border p-3 ${
                      block.status === "COMPLETED"
                        ? "bg-surface-muted opacity-70"
                        : "bg-surface"
                    }`}
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium tabular-nums">
                        {formatTime(block.startAt, timezone)}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        {formatTimeRange(block.startAt, block.endAt, timezone)
                          .split("–")[1]
                          ?.trim()}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            block.status === "COMPLETED" ? "line-through" : ""
                          }`}
                        >
                          {block.title}
                        </p>
                        <TypeBadge type={block.type} />
                        {block.isPrep ? <Badge tone="info">Study</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatMinutes(block.minutes)}
                        {block.focus ? ` · ${block.focus}` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        updateSession(
                          block.id,
                          block.status === "COMPLETED" ? "PLANNED" : "COMPLETED",
                        )
                      }
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors hover:bg-surface-muted disabled:opacity-50"
                    >
                      {block.status === "COMPLETED" ? "Undo" : "Done"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-3 text-xs text-muted">
          Plans stay in Homework Agent. Nothing is added to your Google Calendar.
        </p>
      </CardBody>
    </Card>
  );
}
