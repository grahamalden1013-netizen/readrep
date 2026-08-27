"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useScrolled } from "@/lib/client/browser-stores";
import { PRIMARY_NAV } from "./nav-config";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { SearchDialog } from "./search-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderViewer {
  displayName: string;
  username: string;
  initials: string;
  hue: number;
  role: "reader" | "editor";
}

export function HeaderNav({ viewer }: { viewer: HeaderViewer | null }) {
  const pathname = usePathname();
  const scrolled = useScrolled();
  // Tracking which route the menu was opened on closes it on navigation
  // without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-paper/85 backdrop-blur-md transition-colors duration-300",
        scrolled ? "border-hairline" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Logo showFullName />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[0.875rem] font-medium transition-colors",
                    isActive(item.href)
                      ? "text-ink"
                      : "text-ink-3 hover:text-ink",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3.5 -bottom-px h-px bg-accent"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchDialog />
          <ThemeToggle className="hidden sm:grid" />

          {viewer ? (
            <Link
              href="/profile"
              className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-2"
            >
              <Avatar initials={viewer.initials} hue={viewer.hue} size="sm" />
              <span className="hidden text-[0.8125rem] font-medium text-ink sm:block">
                {viewer.displayName.split(" ")[0]}
              </span>
            </Link>
          ) : (
            <Button asChild size="sm" variant="primary" className="ml-1 hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setOpenPath(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="animate-fade fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-hairline bg-paper lg:hidden"
        >
          <nav aria-label="Primary mobile" className="mx-auto max-w-[1400px] px-5 py-2 sm:px-8">
            <ul className="divide-y divide-hairline">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-1 py-4"
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "text-lg font-semibold tracking-tight",
                        isActive(item.href) ? "text-accent" : "text-ink",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-[0.8125rem] text-ink-3">
                      {item.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-hairline py-5">
              {viewer ? (
                <Button asChild variant="outline" size="md">
                  <Link href="/profile">Your profile</Link>
                </Button>
              ) : (
                <Button asChild size="md">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
