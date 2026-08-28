import type { Metadata } from "next";
import Link from "next/link";
import { login } from "../actions";
import { Button, Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm">
      <Eyebrow tone="accent">Welcome back</Eyebrow>
      <h1 className="mt-3 text-3xl leading-tight">Log in</h1>

      <form action={login} className="mt-8 flex flex-col gap-4">
        {error && (
          <p
            role="alert"
            className="rounded-sm border border-oppose/30 bg-oppose-soft px-3 py-2.5 text-sm text-oppose"
          >
            {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1.5 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1.5 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <Button type="submit" size="lg" full className="mt-2">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-mute">
        No account?{" "}
        <Link href="/signup" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>

      <p className="mt-8 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
        You do not need an account to read a briefing or follow a debate. One is
        only required to submit a response.
      </p>
    </div>
  );
}
