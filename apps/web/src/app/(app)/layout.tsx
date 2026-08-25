import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor, getCurrentUser } from "@/server/auth/authorize";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const actor = await getCurrentActor();
  const roles = new Set(
    (actor?.memberships ?? []).filter((m) => m.status === "active").map((m) => m.role),
  );
  const coaches = roles.has("coach") || roles.has("program_admin");
  const plays = roles.has("player");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-ink-800 bg-ink-900/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-6">
            <Link
              href={plays ? "/player" : "/coach"}
              className="text-chalk-50 text-sm font-semibold tracking-tight"
            >
              ReadRep
            </Link>
            <nav className="flex items-center gap-5" aria-label="Main">
              {plays && (
                <Link
                  href="/player"
                  className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
                >
                  Sessions
                </Link>
              )}
              {coaches && (
                <>
                  <Link
                    href="/coach"
                    className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
                  >
                    Team
                  </Link>
                  <Link
                    href="/coach/review"
                    className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
                  >
                    Review
                  </Link>
                  <Link
                    href="/coach/system"
                    className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
                  >
                    System
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-chalk-500 hidden text-sm sm:inline">
              {user.displayName}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
