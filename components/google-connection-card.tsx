import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/auth";

export type ConnectionState =
  | { status: "connected"; calendarCount: number }
  | { status: "expired"; message: string }
  | { status: "disconnected" };

export function GoogleConnectionCard({ state }: { state: ConnectionState }) {
  return (
    <Card>
      <CardHeader
        title="Google Calendar"
        description="Read-only access to your calendars."
        action={
          state.status === "connected" ? (
            <Badge tone="success">Connected</Badge>
          ) : state.status === "expired" ? (
            <Badge tone="warning">Reconnect needed</Badge>
          ) : (
            <Badge tone="neutral">Not connected</Badge>
          )
        }
      />
      <CardBody className="space-y-4">
        {state.status === "connected" ? (
          <p className="text-sm text-muted">
            Reading {state.calendarCount}{" "}
            {state.calendarCount === 1 ? "calendar" : "calendars"} from your
            Google account.
          </p>
        ) : state.status === "expired" ? (
          <p className="text-sm text-muted">{state.message}</p>
        ) : (
          <p className="text-sm text-muted">
            Connect Google to let Homework Agent read your Schoology feed and
            find your free time.
          </p>
        )}

        <div className="rounded-lg bg-surface-muted px-3 py-2.5">
          <p className="text-xs font-medium">Granted scopes</p>
          <ul className="mt-1 space-y-0.5">
            {GOOGLE_CALENDAR_SCOPES.map((scope) => (
              <li key={scope} className="font-mono text-[11px] break-all text-muted">
                {scope.replace("https://www.googleapis.com/auth/", "")}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">
            Both are read-only. Homework Agent cannot create, edit or delete
            calendar events.
          </p>
        </div>

        {state.status === "connected" ? (
          <Link
            href="/settings/calendars"
            className={buttonClasses("secondary", "sm")}
          >
            Choose calendars
          </Link>
        ) : (
          <GoogleSignInButton
            callbackURL="/settings/calendars"
            label={
              state.status === "expired"
                ? "Reconnect Google"
                : "Connect Google"
            }
          />
        )}
      </CardBody>
    </Card>
  );
}
