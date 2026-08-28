import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "../actions";
import { Button, Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm">
      <Eyebrow tone="accent">Join NGN</Eyebrow>
      <h1 className="mt-3 text-3xl leading-tight">Create an account</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-mute">
        Email and a password. That is all we ask for — you pick a username next,
        and everything after that is optional.
      </p>

      <form action={signup} className="mt-8 flex flex-col gap-4">
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
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
          />
          <span className="mt-1.5 block text-xs text-ink-faint">
            At least 8 characters.
          </span>
        </label>

        <Button type="submit" size="lg" full className="mt-2">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>

      <p className="mt-8 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
        NGN never asks for your birthday, your full name or your address. Your
        political views are never public, and there is no ideology question
        anywhere in signup.
      </p>
    </div>
  );
}
