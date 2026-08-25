"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type SignInState } from "../actions";

const initial: SignInState = { message: null };

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-chalk-50 hover:text-court-400 text-sm font-semibold tracking-tight"
        >
          ReadRep
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-chalk-400 mt-1.5 text-sm">
          Teams, film, and player profiles are private by default.
        </p>

        <form action={action} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="text-chalk-200 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="border-ink-600 bg-ink-850 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-chalk-200 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="border-ink-600 bg-ink-850 text-chalk-50 focus:border-court-500 mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>

          {state.message && (
            <p role="alert" className="text-quality-risk text-sm">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-court-500 text-ink-950 hover:bg-court-400 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="border-ink-700 bg-ink-850 mt-8 rounded-lg border p-4">
          <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
            Local demonstration accounts
          </p>
          <p className="text-chalk-400 mt-2 text-sm leading-relaxed">
            Run <code className="text-chalk-200 font-mono">pnpm seed</code>, then sign
            in as <code className="text-chalk-200 font-mono">player@readrep.local</code>{" "}
            or <code className="text-chalk-200 font-mono">coach@readrep.local</code>.
            The seed script prints the password and the rest of the accounts.
          </p>
        </div>
      </div>
    </main>
  );
}
