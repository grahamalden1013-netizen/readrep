"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "Film" },
  { href: "/settings", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard")
    return (
      pathname.startsWith("/dashboard") || pathname.startsWith("/sessions")
    );
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname.startsWith("/games") || pathname.startsWith("/studio");
}

/**
 * One header for every application route, film room included. It changes
 * colour with the shell because every value it uses is a role token — so a
 * player entering a session is never handed a different product.
 */
export function AppHeader({
  email,
  canSignIn,
  logout,
}: {
  email: string | null;
  canSignIn: boolean;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="page-shell flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-1 sm:gap-5">
          <Wordmark href="/dashboard" />
          <nav aria-label="Primary" className="flex items-center">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-xs px-2.5 py-4 text-[0.8125rem] font-medium transition-[color] duration-150 sm:px-3 ${
                    active ? "text-fg" : "text-fg-faint hover:text-fg"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2.5 bottom-0 h-[2px] bg-accent sm:inset-x-3"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ButtonLink href="/games/new" size="sm">
            Upload film
          </ButtonLink>
          {email ? (
            <form action={logout} className="flex items-center gap-3">
              <span className="hidden max-w-[14rem] truncate text-[0.8125rem] text-fg-faint lg:inline">
                {email}
              </span>
              <button
                type="submit"
                className="rounded-xs text-[0.8125rem] font-medium text-fg-faint transition-[color] duration-150 hover:text-fg"
              >
                Log out
              </button>
            </form>
          ) : canSignIn ? (
            <Link
              href="/login"
              className="rounded-xs text-[0.8125rem] font-medium text-fg-faint transition-[color] duration-150 hover:text-fg"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
