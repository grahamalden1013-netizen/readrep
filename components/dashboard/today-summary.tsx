import { TypeBadge } from "@/components/assignment/type-badge";
import { Card } from "@/components/ui/card";
import { formatCountdown, formatDue, formatMinutes } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";

/**
 * The four numbers that answer "what do I need to know right now".
 */
export function TodaySummary({ data }: { data: DashboardData }) {
  const { today, timezone, now } = data;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Highest priority">
        {today.topTask ? (
          <>
            <p className="text-sm font-semibold leading-snug text-pretty">
              {today.topTask.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <TypeBadge type={today.topTask.type} />
              <span className="text-xs text-muted">
                {formatDue(
                  today.topTask.dueAt,
                  today.topTask.allDay,
                  timezone,
                  now,
                )}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Nothing outstanding.</p>
        )}
      </Tile>

      <Tile label="Due today">
        <p className="text-2xl font-semibold tabular-nums">
          {today.dueTodayMinutes > 0
            ? formatMinutes(today.dueTodayMinutes)
            : "—"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {data.groups.today.length} item
          {data.groups.today.length === 1 ? "" : "s"} · {today.openCount} open
          overall
        </p>
      </Tile>

      <Tile label="Next major assessment">
        {today.nextAssessment ? (
          <>
            <p className="text-sm font-semibold leading-snug text-pretty">
              {today.nextAssessment.title}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              {formatCountdown(today.nextAssessment.daysLeft)} ·{" "}
              {today.nextAssessment.prep.label}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">None scheduled.</p>
        )}
      </Tile>

      <Tile label="Planned today">
        <p className="text-2xl font-semibold tabular-nums">
          {today.plan.length > 0
            ? formatMinutes(
                today.plan.reduce((sum, block) => sum + block.minutes, 0),
              )
            : "—"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {today.plan.length > 0
            ? `${today.plan.length} block${today.plan.length === 1 ? "" : "s"}`
            : "Use Plan My Day"}
        </p>
      </Tile>
    </div>
  );
}

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </Card>
  );
}
