"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { IconButton } from "@/components/ui/icon-button";
import { getNavItems } from "@/lib/nav";
import type { Profile } from "@/types/database";

export function MobileNav({ profile, homeHref }: { profile: Profile; homeHref: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="flex h-[var(--shell-topbar-h)] items-center justify-between border-b border-border bg-surface px-4 md:hidden">
      <Link href={homeHref}>
        <Logo />
      </Link>
      <IconButton label="Open menu" onClick={() => setOpen(true)}>
        <Menu className="size-4.5" aria-hidden="true" />
      </IconButton>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="m-0 ml-0 mr-auto h-svh max-h-none w-[84vw] max-w-xs flex-col border-r border-border bg-surface p-0 text-foreground backdrop:bg-black/60 open:flex"
      >
        <div className="flex h-[var(--shell-topbar-h)] items-center justify-between px-5">
          <Logo />
          <IconButton label="Close menu" onClick={() => setOpen(false)}>
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto">
          <SidebarNav items={getNavItems(profile.role)} onNavigate={() => setOpen(false)} />
        </div>
        <UserMenu profile={profile} settingsHref={profile.role === "coach" ? "/coach/settings" : undefined} />
      </dialog>
    </div>
  );
}
