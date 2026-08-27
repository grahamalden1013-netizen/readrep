import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { signup } from "../actions";
import { DemoSessionForm } from "../demo-session-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const redirectTo =
    typeof params.redirectTo === "string" && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : "/";

  return (
    <div className="w-full max-w-md">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
        Create an account
      </h1>
      <p className="mt-2.5 text-[0.9375rem] leading-6 text-ink-2">
        You need one only to react, save stories or post in discussions.
      </p>

      <div className="mt-6 flex gap-2.5 rounded-xl border border-hairline bg-surface-2 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p className="text-[0.8125rem] leading-5 text-ink-2">
          <span className="font-semibold text-ink">Privacy.</span> Your email is
          never shown to anyone. School and grade are optional, are never
          displayed publicly, and can be left blank.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-2.5 rounded-xl border border-hairline bg-danger-soft px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <p className="text-[0.8125rem] leading-5 text-ink-2">{error}</p>
        </div>
      )}

      <form action={signup} className="mt-7 space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" required maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" maxLength={24} placeholder="optional" />
          </div>
        </div>
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
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="school">School (optional)</Label>
            <Input id="school" name="school" maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade">Grade (optional)</Label>
            <Input id="grade" name="grade" maxLength={24} placeholder="11th grade" />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full">
          Create account
        </Button>
      </form>

      {!isSupabaseConfigured() && <DemoSessionForm redirectTo={redirectTo} />}

      <p className="mt-8 text-[0.8125rem] text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
