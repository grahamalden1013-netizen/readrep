import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logout } from "../(auth)/actions";

/**
 * Deliberately not an auth gate: the demo has to be playable without an
 * account. Signing in only adds identity, it does not unlock the product.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-6">
            <Wordmark href="/dashboard" />
            <Link
              href="/dashboard"
              className="text-sm text-ink-400 transition-colors hover:text-ink-50"
            >
              Dashboard
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-ink-500 sm:inline">{user.email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-50"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : isSupabaseConfigured ? (
            <Link
              href="/login"
              className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-50"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
