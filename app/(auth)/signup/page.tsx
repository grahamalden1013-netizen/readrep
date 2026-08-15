import Link from "next/link";
import { signup } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <form action={signup} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">I&apos;m a...</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="player" required />
              Player
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="coach" required />
              Coach
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input
            type="text"
            name="full_name"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded bg-foreground px-4 py-2 text-background font-medium"
        >
          Sign up
        </button>

        <p className="text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
