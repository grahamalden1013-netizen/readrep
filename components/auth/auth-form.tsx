import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { isSupabaseConfigured } from "@/lib/env";

const inputClass =
  "h-10 rounded-panel border border-ink-600 bg-ink-950 px-3 text-sm text-ink-50 placeholder:text-ink-600 focus:border-ink-400";

export function AuthForm({
  mode,
  action,
  error,
}: {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  error?: string;
}) {
  const isLogin = mode === "login";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
          <Wordmark />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-50">
            {isLogin ? "Log in" : "Create an account"}
          </h1>
          <p className="text-sm text-ink-400">
            An account keeps your sessions across devices.{" "}
            <Link href="/dashboard" className="text-ink-200 underline underline-offset-4">
              The demo works without one.
            </Link>
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <p className="rounded-panel border border-ink-700 bg-ink-900 px-4 py-3 text-sm leading-relaxed text-ink-300">
            Accounts are turned off because Supabase is not configured in this environment. Set
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable them.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-signal-bad">
            {error}
          </p>
        ) : null}

        <form action={action} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-ink-400">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              disabled={!isSupabaseConfigured}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-ink-400">Password</span>
            <input
              type="password"
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={8}
              disabled={!isSupabaseConfigured}
              className={inputClass}
            />
          </label>

          <Button type="submit" disabled={!isSupabaseConfigured} size="lg">
            {isLogin ? "Log in" : "Sign up"}
          </Button>
        </form>

        <p className="text-sm text-ink-500">
          {isLogin ? "No account? " : "Already have one? "}
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="font-medium text-ink-200 underline underline-offset-4"
          >
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
