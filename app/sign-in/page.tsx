import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Card, CardBody } from "@/components/ui/card";
import { integrationStatus } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  oauth:
    "Google sign-in did not complete. Please try again, and make sure you allow calendar access.",
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await props.searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const message = errorKey ? ERROR_MESSAGES[errorKey] : undefined;
  const { google: googleConfigured } = integrationStatus();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm font-medium text-accent">
        ← Homework Agent
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Sign in with Google
      </h1>
      <p className="mt-2 text-sm text-muted">
        Homework Agent reads your calendars to find assignments and free time.
        Access is read-only.
      </p>

      {message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {message}
        </p>
      ) : null}

      <div className="mt-6">
        {googleConfigured ? (
          <GoogleSignInButton />
        ) : (
          <Card>
            <CardBody>
              <p className="text-sm font-semibold">Google sign-in not configured</p>
              <p className="mt-1.5 text-sm text-muted">
                Set <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code>{" "}
                and{" "}
                <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code>{" "}
                in your environment, then restart the server. See{" "}
                <code className="font-mono text-xs">README.md</code> for the
                Google Cloud setup steps.
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      <ul className="mt-8 space-y-2 text-xs text-muted">
        <li>• We request only calendar read access — never write access.</li>
        <li>• Your completion status is stored in our database, not Google.</li>
        <li>• Nothing is ever submitted or sent on your behalf.</li>
      </ul>
    </main>
  );
}
