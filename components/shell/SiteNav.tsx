"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useArena } from "@/components/providers/ArenaProvider";
import { divisionName } from "@/lib/arena/divisions";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { DEMO_NOTIFICATIONS } from "@/data/demo/classroom";

/**
 * Primary navigation.
 *
 * Desktop: a single rule-bounded bar. Mobile: the same links in a full-height
 * sheet, plus a persistent bottom bar so the two things students do most —
 * enter the Arena and read the brief — are always one tap away.
 */

const PRIMARY = [
  { href: "/today", label: "Today" },
  { href: "/arena", label: "Arena" },
  { href: "/issues", label: "Issues" },
  { href: "/rankings", label: "Rankings" },
  { href: "/discuss", label: "Discuss" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  const { ready, profile } = useArena();
  const [open, setOpen] = useState(false);
  const [navigatedFrom, setNavigatedFrom] = useState(pathname);

  // Close the sheet on navigation. Done during render so the sheet never
  // paints over the new page for a frame.
  if (navigatedFrom !== pathname) {
    setNavigatedFrom(pathname);
    setOpen(false);
  }

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;
  const isTeacher = profile?.role === "teacher";
  const isAdmin = profile?.role === "admin";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Logo />

          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center gap-1 lg:flex"
          >
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={`relative rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(pathname, item.href)
                    ? "text-ink"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {item.label}
                {isActive(pathname, item.href) && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-[2px] bg-lime-deep"
                  />
                )}
              </Link>
            ))}
            {isTeacher && (
              <Link
                href="/classroom"
                className="rounded-sm px-3 py-2 text-sm font-medium text-ink-mute transition-colors hover:text-ink"
              >
                Classroom
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-sm px-3 py-2 text-sm font-medium text-ink-mute transition-colors hover:text-ink"
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Search"
              className="rounded-sm p-2 text-ink-mute transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <SearchIcon />
            </Link>

            <Link
              href="/notifications"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              className="relative rounded-sm p-2 text-ink-mute transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <BellIcon />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-live"
                />
              )}
            </Link>

            <Link
              href="/profile"
              className="ml-1 hidden items-center gap-2.5 rounded-sm border border-rule px-2.5 py-1.5 transition-colors hover:border-rule-strong sm:flex"
            >
              {ready && profile ? (
                <>
                  <span className="tnum text-sm font-semibold leading-none">
                    {profile.rating}
                  </span>
                  <DivisionBadge division={divisionName(profile.rating)} size="sm" />
                </>
              ) : (
                <span className="text-sm font-medium text-ink-soft">Sign in</span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="rounded-sm p-2 text-ink transition-colors hover:bg-paper-sunken lg:hidden"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto border-t border-rule bg-paper lg:hidden"
        >
          <nav aria-label="Primary mobile" className="px-4 py-3">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between border-b border-rule py-4 text-lg ${
                  isActive(pathname, item.href) ? "text-ink" : "text-ink-soft"
                }`}
              >
                <span className="font-serif">{item.label}</span>
                <ChevronIcon />
              </Link>
            ))}
            {isTeacher && (
              <Link href="/classroom" className="flex items-center justify-between border-b border-rule py-4 text-lg text-ink-soft">
                <span className="font-serif">Classroom</span>
                <ChevronIcon />
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="flex items-center justify-between border-b border-rule py-4 text-lg text-ink-soft">
                <span className="font-serif">Admin</span>
                <ChevronIcon />
              </Link>
            )}
            <Link href="/profile" className="flex items-center justify-between border-b border-rule py-4 text-lg text-ink-soft">
              <span className="font-serif">Profile</span>
              <ChevronIcon />
            </Link>
            <Link href="/parties" className="flex items-center justify-between py-4 text-lg text-ink-soft">
              <span className="font-serif">Party Explorer</span>
              <ChevronIcon />
            </Link>
          </nav>

          <div className="border-t border-rule px-4 py-5">
            <Link
              href="/arena"
              className="flex h-12 w-full items-center justify-center rounded-sm bg-ink text-sm font-medium text-ink-inverse"
            >
              Enter Today&apos;s Arena
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/* --- Icons: inline so the app ships no icon dependency ------------------- */

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5.5 8a4.5 4.5 0 1 1 9 0c0 3 1 4.5 1.5 5h-12c.5-.5 1.5-2 1.5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden className="text-ink-faint">
      <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
