import type { Metadata } from "next";
import Link from "next/link";

import { DayPlan } from "@/components/dashboard/day-plan";
import { SyncButton } from "@/components/dashboard/sync-button";
import { TestsSection } from "@/components/dashboard/tests-section";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { TodoSection } from "@/components/dashboard/todo-section";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getDashboardData } from "@/lib/queries/dashboard";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  if (!data.hasSchoolCalendar) {
    return <NoCalendarState />;
  }

  const firstName = user.name.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good {greeting(data.now, data.timezone)}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {data.today.openCount === 0
              ? "You're all caught up."
              : `${data.today.openCount} open item${data.today.openCount === 1 ? "" : "s"} across your courses.`}
          </p>
        </div>
        <SyncButton lastSyncedAt={data.lastSyncedAt} />
      </header>

      <TodaySummary data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodaySchedule schedule={data.today.schedule} timezone={data.timezone} />
        <DayPlan
          plan={data.today.plan}
          timezone={data.timezone}
          breakMinutes={user.preferences.breakMinutes}
        />
      </div>

      <TestsSection assessments={data.assessments} timezone={data.timezone} />

      <TodoSection
        groups={data.groups}
        timezone={data.timezone}
        now={data.now}
      />
    </div>
  );
}

function greeting(now: Date, timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now),
  );
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function NoCalendarState() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <Card>
        <CardHeader
          title="Pick your Schoology calendar"
          description="Homework Agent needs to know which calendar carries your assignments."
        />
        <CardBody>
          <Link
            href="/settings/calendars"
            className={buttonClasses("primary", "sm")}
          >
            Choose calendars
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
