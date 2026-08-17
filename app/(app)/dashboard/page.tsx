import type { Metadata } from "next";
import { Suspense } from "react";

import {
  GoogleConnectionCard,
  type ConnectionState,
} from "@/components/google-connection-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listCalendars } from "@/lib/google/calendars";
import {
  GoogleAuthExpiredError,
  GoogleNotConnectedError,
  hasGoogleConnection,
} from "@/lib/google/client";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user.name.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Timezone {user.timezone}. Homework starts at{" "}
          {user.preferences.earliestStart} and ends by{" "}
          {user.preferences.latestEnd}.
        </p>
      </div>

      <Suspense fallback={<ConnectionSkeleton />}>
        <ConnectionSection userId={user.id} />
      </Suspense>

      <Card>
        <CardHeader
          title="What's next"
          description="Stage 1 of the build is in place."
        />
        <CardBody>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              ✓ App shell, database, Google sign-in and calendar connection.
            </li>
            <li>
              → Next: discover your calendars, read the Schoology feed, and list
              your upcoming assignments.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

async function ConnectionSection({ userId }: { userId: string }) {
  const state = await loadConnectionState(userId);
  return <GoogleConnectionCard state={state} />;
}

/**
 * Proves the stored Google grant actually works by making a real API call
 * rather than just checking that a row exists.
 */
async function loadConnectionState(userId: string): Promise<ConnectionState> {
  if (!(await hasGoogleConnection(userId))) {
    return { status: "disconnected" };
  }
  try {
    const calendars = await listCalendars(userId);
    return { status: "connected", calendarCount: calendars.length };
  } catch (error) {
    if (error instanceof GoogleNotConnectedError) {
      return { status: "disconnected" };
    }
    if (error instanceof GoogleAuthExpiredError) {
      return { status: "expired", message: error.message };
    }
    return {
      status: "expired",
      message:
        error instanceof Error
          ? `Could not reach Google Calendar: ${error.message}`
          : "Could not reach Google Calendar.",
    };
  }
}

function ConnectionSkeleton() {
  return (
    <Card>
      <CardHeader title="Google Calendar" description="Checking connection…" />
      <CardBody>
        <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
      </CardBody>
    </Card>
  );
}
