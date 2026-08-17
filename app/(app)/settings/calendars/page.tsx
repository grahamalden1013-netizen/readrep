import type { Metadata } from "next";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { listCalendars } from "@/lib/google/calendars";
import {
  GoogleAuthExpiredError,
  GoogleNotConnectedError,
} from "@/lib/google/client";
import { requireUser } from "@/lib/session";

import { CalendarPicker } from "./calendar-picker";

export const metadata: Metadata = { title: "Calendars" };

export default async function CalendarsPage() {
  const user = await requireUser();

  const sources = await prisma.calendarSource.findMany({
    where: { userId: user.id },
    select: { googleCalendarId: true, type: true },
  });

  const initialSchoolId =
    sources.find((s) => s.type === "SCHOOL")?.googleCalendarId ?? null;
  const initialBusyIds = sources
    .filter((s) => s.type === "BUSY")
    .map((s) => s.googleCalendarId);

  let calendars;
  try {
    calendars = await listCalendars(user.id);
  } catch (error) {
    return (
      <Shell>
        <Card>
          <CardHeader title="Google Calendar unavailable" />
          <CardBody className="space-y-4">
            <p className="text-sm text-muted">
              {error instanceof GoogleNotConnectedError
                ? "Connect your Google account to choose calendars."
                : error instanceof GoogleAuthExpiredError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : "Could not read your Google calendars."}
            </p>
            <GoogleSignInButton
              callbackURL="/settings/calendars"
              label="Reconnect Google"
            />
          </CardBody>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <CalendarPicker
        calendars={calendars}
        initialSchoolId={initialSchoolId}
        initialBusyIds={initialBusyIds}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendars</h1>
        <p className="mt-1 text-sm text-muted">
          Choose which Google calendar holds your Schoology assignments, and
          which ones mean you are busy. Nothing is ever written back.
        </p>
      </div>
      {children}
    </div>
  );
}
