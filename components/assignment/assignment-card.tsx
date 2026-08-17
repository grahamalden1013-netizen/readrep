"use client";

import { useState, useTransition } from "react";

import { setAssignmentStatus } from "@/app/(app)/dashboard/actions";
import {
  PriorityBadge,
  STATUS_LABEL,
  TypeBadge,
} from "@/components/assignment/type-badge";
import type { AssignmentStatus } from "@/lib/generated/prisma/enums";
import { formatDue, formatMinutes, previewText } from "@/lib/format";
import type { AssignmentView } from "@/lib/queries/dashboard";

const STATUS_CYCLE: AssignmentStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "DONE",
  "SKIPPED",
];

export function AssignmentCard({
  assignment,
  timezone,
  now,
  compact = false,
}: {
  assignment: AssignmentView;
  timezone: string;
  now: Date;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const preview = previewText(assignment.description, compact ? 90 : 160);
  const isClosed =
    assignment.status === "DONE" || assignment.status === "SKIPPED";

  function updateStatus(status: AssignmentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setAssignmentStatus({
        assignmentId: assignment.id,
        status,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <article
      className={`group rounded-lg border border-border bg-surface p-3.5 transition-colors sm:p-4 ${
        isClosed ? "opacity-60" : ""
      } ${assignment.isOverdue ? "border-l-2 border-l-red-500" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-medium leading-snug text-pretty ${
              assignment.status === "DONE" ? "line-through" : ""
            }`}
          >
            {assignment.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {assignment.course ? (
              <>
                <span className="font-medium">{assignment.course}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span className={assignment.isOverdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
              {assignment.isOverdue ? "Overdue · " : ""}
              {formatDue(assignment.dueAt, assignment.allDay, timezone, now)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatMinutes(assignment.estimatedMinutes)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TypeBadge type={assignment.type} />
          {!isClosed ? <PriorityBadge score={assignment.priorityScore} /> : null}
        </div>
      </div>

      {preview ? (
        <div className="mt-2.5">
          <p className="text-xs leading-relaxed text-muted">
            {expanded ? assignment.description : preview}
          </p>
          {assignment.description &&
          assignment.description.length > preview.length ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-xs font-medium text-accent hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {assignment.removedFromSource ? (
        <p className="mt-2.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Removed from the Schoology calendar. Your status is kept here.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label className="sr-only" htmlFor={`status-${assignment.id}`}>
          Status for {assignment.title}
        </label>
        <select
          id={`status-${assignment.id}`}
          value={assignment.status}
          disabled={pending}
          onChange={(event) =>
            updateStatus(event.target.value as AssignmentStatus)
          }
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs font-medium disabled:opacity-50"
        >
          {STATUS_CYCLE.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>

        {assignment.sourceUrl ? (
          <a
            href={assignment.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent hover:underline"
          >
            Open in Schoology ↗
          </a>
        ) : null}

        {pending ? <span className="text-xs text-muted">Saving…</span> : null}
        {error ? (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        ) : null}
      </div>
    </article>
  );
}
