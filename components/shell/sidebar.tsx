import Link from "next/link";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import type { Profile } from "@/types/database";

export function Sidebar({
  profile,
  teamName,
  homeHref,
}: {
  profile: Profile;
  teamName?: string | null;
  homeHref: string;
}) {
  return (
    <aside className="hidden w-[var(--shell-sidebar-w)] shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-[var(--shell-topbar-h)] items-center px-5">
        <Link href={homeHref}>
          <Logo />
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-y-auto">
        <SidebarNav role={profile.role} />
      </div>
      <UserMenu profile={profile} teamName={teamName} settingsHref={profile.role === "coach" ? "/coach/settings" : undefined} />
    </aside>
  );
}
