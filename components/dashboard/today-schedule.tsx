import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatTimeRange } from "@/lib/format";
import type { ScheduleEntry } from "@/lib/queries/dashboard";

/**
 * The student's real calendar for today, straight from their own calendars.
 * The Schoology feed is deliberately absent — a due date is not an appointment.
 */
export function TodaySchedule({
  schedule,
  timezone,
}: {
  schedule: ScheduleEntry[];
  timezone: string;
}) {
  const timed = schedule.filter((entry) => !entry.allDay);
  const allDay = schedule.filter((entry) => entry.allDay);

  return (
    <Card>
      <CardHeader
        title="Today's schedule"
        description="From your own calendars — homework is never planned over these."
      />
      <CardBody>
        {allDay.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {allDay.map((entry) => (
              <span
                key={entry.id}
                className="rounded-md bg-surface-muted px-2 py-1 text-xs text-muted"
              >
                {entry.title}
              </span>
            ))}
          </div>
        ) : null}

        {timed.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing scheduled today — the whole homework window is free.
          </p>
        ) : (
          <ol className="space-y-2">
            {timed.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <span className="w-32 shrink-0 tabular-nums text-muted">
                  {formatTimeRange(entry.startAt, entry.endAt, timezone)}
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
