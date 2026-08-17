import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

const FEATURES = [
  {
    title: "Reads your Schoology calendar",
    body: "Homework, quizzes, projects and major assessments are pulled straight from the Schoology feed already synced into Google Calendar.",
  },
  {
    title: "Plans around the rest of your life",
    body: "Practice, work shifts and family events block out time, so the plan you get is one you can actually follow.",
  },
  {
    title: "Starts tests early",
    body: "Major assessments get spaced study sessions across several days instead of one panicked night before.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-accent">Homework Agent</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Stop finding out about the test the night before.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted text-pretty">
        Connect Google Calendar once. Your Schoology assignments get sorted,
        prioritized and scheduled into the free time you actually have.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/sign-in" className={buttonClasses("primary")}>
          Get started
        </Link>
      </div>

      <dl className="mt-14 grid gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title}>
            <dt className="text-sm font-semibold">{feature.title}</dt>
            <dd className="mt-1.5 text-sm text-muted">{feature.body}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-14 text-xs text-muted">
        Calendar access is read-only. Homework Agent never edits your calendar,
        submits work, or touches Schoology.
      </p>
    </main>
  );
}
