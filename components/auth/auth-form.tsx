import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { isSupabaseConfigured } from "@/lib/env";

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
    <div className="is-document shell-marketing flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="page-shell flex h-14 items-center">
          <Wordmark />
        </div>
      </header>

      <div className="page-shell flex flex-1 flex-col justify-center py-14">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h1 className="display-2 text-fg">{isLogin ? "Log in" : "Create an account"}</h1>
            <p className="text-sm leading-relaxed text-fg-soft">
              An account keeps your sessions across devices.{" "}
              <Link
                href="/dashboard"
                className="font-medium text-fg underline underline-offset-4"
              >
                The demo works without one.
              </Link>
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <p className="rounded-panel border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-fg-soft">
              Accounts are turned off because Supabase is not configured in this environment. Set
              NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable them.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}

          <form action={action} className="flex flex-col gap-4">
            <Field label="Email">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                disabled={!isSupabaseConfigured}
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={8}
                disabled={!isSupabaseConfigured}
                className={inputClass}
              />
            </Field>

            <Button type="submit" disabled={!isSupabaseConfigured} size="lg" className="mt-1">
              {isLogin ? "Log in" : "Sign up"}
            </Button>
          </form>

          <p className="text-sm text-fg-faint">
            {isLogin ? "No account? " : "Already have one? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium text-fg underline underline-offset-4"
            >
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
