"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

// Extended as each stage lands a route; every entry here must resolve.
const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/settings/calendars", label: "Calendars" },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Homework Agent
        </Link>

        <nav className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title={email}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
        >
          {signingOut ? "…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
