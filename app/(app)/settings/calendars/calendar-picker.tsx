"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { DiscoveredCalendar } from "@/lib/google/calendars";

import { saveCalendarSelection } from "./actions";

export function CalendarPicker({
  calendars,
  initialSchoolId,
  initialBusyIds,
}: {
  calendars: DiscoveredCalendar[];
  initialSchoolId: string | null;
  initialBusyIds: string[];
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(initialSchoolId);
  const [busyIds, setBusyIds] = useState<Set<string>>(
    () => new Set(initialBusyIds),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  function toggleBusy(id: string) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMessage(null);
  }

  function chooseSchool(id: string | null) {
    setSchoolId(id);
    // A calendar can't be both the assignment source and a busy blocker.
    if (id) {
      setBusyIds((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
    setMessage(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveCalendarSelection({
        schoolCalendarId: schoolId,
        busyCalendarIds: [...busyIds],
      });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({
        tone: "ok",
        text: result.schoolSelected
          ? `Saved. School calendar set, ${result.busyCount} busy ${
              result.busyCount === 1 ? "calendar" : "calendars"
            }.`
          : "Saved, but no school calendar is selected yet.",
      });
      router.refresh();
    });
  }

  const suggested = calendars.find((c) => c.looksLikeSchoology);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="School calendar"
          description="The calendar your Schoology assignments arrive on. Assignments are read from here."
        />
        <CardBody className="space-y-2">
          {suggested && schoolId !== suggested.id ? (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
              “{suggested.name}” looks like your Schoology feed.
            </p>
          ) : null}

          {calendars.map((calendar) => (
            <label
              key={calendar.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-surface-muted has-checked:border-accent has-checked:bg-accent-soft"
            >
              <input
                type="radio"
                name="school-calendar"
                className="mt-1 accent-[var(--accent)]"
                checked={schoolId === calendar.id}
                onChange={() => chooseSchool(calendar.id)}
              />
              <CalendarLabel calendar={calendar} />
            </label>
          ))}

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border border-dashed px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted">
            <input
              type="radio"
              name="school-calendar"
              className="accent-[var(--accent)]"
              checked={schoolId === null}
              onChange={() => chooseSchool(null)}
            />
            No school calendar
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Calendars that block my time"
          description="Events on these calendars mark you as busy. The planner will never schedule work over them."
        />
        <CardBody className="space-y-2">
          {calendars
            .filter((calendar) => calendar.id !== schoolId)
            .map((calendar) => (
              <label
                key={calendar.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-surface-muted has-checked:border-accent has-checked:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--accent)]"
                  checked={busyIds.has(calendar.id)}
                  onChange={() => toggleBusy(calendar.id)}
                />
                <CalendarLabel calendar={calendar} />
              </label>
            ))}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save calendars"}
        </Button>
        {message ? (
          <p
            className={`text-sm ${
              message.tone === "ok"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CalendarLabel({ calendar }: { calendar: DiscoveredCalendar }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{calendar.name}</span>
        {calendar.primary ? <Badge tone="info">Primary</Badge> : null}
        {calendar.looksLikeSchoology ? (
          <Badge tone="accent">Schoology</Badge>
        ) : null}
      </span>
      {calendar.description ? (
        <span className="mt-0.5 block truncate text-xs text-muted">
          {calendar.description}
        </span>
      ) : null}
    </span>
  );
}
