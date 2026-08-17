import { TypeBadge } from "@/components/assignment/type-badge";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCountdown, formatDayLabel, formatMinutes } from "@/lib/format";
import type { PrepStatus } from "@/lib/planner/test-prep";
import type { AssessmentView } from "@/lib/queries/dashboard";

const PREP_TONE: Record<PrepStatus, BadgeTone> = {
  "not-started": "neutral",
  "in-progress": "info",
  "on-track": "success",
  overdue: "danger",
};

/**
 * Upcoming assessments with their countdown and the spaced study plan, so the
 * night-before cram never has to happen.
 */
export function TestsSection({
  assessments,
  timezone,
}: {
  assessments: AssessmentView[];
  timezone: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Tests & assessments"
        description="Study is spread across several days automatically."
      />
      <CardBody>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted">
            No upcoming tests, quizzes or projects.
          </p>
        ) : (
          <ul className="space-y-3">
            {assessments.map((assessment) => (
              <li
                key={assessment.id}
                className="rounded-lg border border-border p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-pretty">
                      {assessment.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <TypeBadge type={assessment.type} />
                      {assessment.course ? (
                        <span className="text-xs text-muted">
                          {assessment.course}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold tabular-nums leading-none">
                      {formatCountdown(assessment.daysLeft)}
                    </p>
                    <div className="mt-1.5">
                      <Badge tone={PREP_TONE[assessment.prep.status]}>
                        {assessment.prep.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {assessment.prep.sessions.length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted">
                      Study plan · {formatMinutes(assessment.prep.totalMinutes)}{" "}
                      total
                    </p>
                    <ol className="mt-2 flex flex-wrap gap-1.5">
                      {assessment.prep.sessions.map((session, index) => (
                        <li
                          key={`${assessment.id}-${index}`}
                          className="rounded-md bg-surface-muted px-2 py-1 text-xs"
                          title={session.focus ?? undefined}
                        >
                          <span className="font-medium">
                            {formatDayLabel(session.day, timezone)}
                          </span>{" "}
                          <span className="text-muted">
                            {session.minutes} min
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
