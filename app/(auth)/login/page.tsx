import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { login } from "../actions";
import { DemoSessionForm } from "../demo-session-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const redirectTo =
    typeof params.redirectTo === "string" && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : "/";

  return (
    <div className="w-full max-w-md">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
        Sign in
      </h1>
      <p className="mt-2.5 text-[0.9375rem] leading-6 text-ink-2">
        Signing in lets you save stories, react and join discussions. Reading
        NGN never requires an account.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-2.5 rounded-xl border border-hairline bg-danger-soft px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <p className="text-[0.8125rem] leading-5 text-ink-2">{error}</p>
        </div>
      )}

      <form action={login} className="mt-7 space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Sign in
        </Button>
      </form>

      {!isSupabaseConfigured() && <DemoSessionForm redirectTo={redirectTo} />}

      <p className="mt-8 text-[0.8125rem] text-ink-3">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
