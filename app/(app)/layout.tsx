import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { logout } from "../(auth)/actions";
import { Logo } from "@/components/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const nav =
    profile.role === "coach"
      ? [{ href: "/coach", label: "Team", icon: Users }]
      : [{ href: "/dashboard", label: "Sessions", icon: LayoutDashboard }];

  return (
    <div className="flex min-h-svh w-full">
      <aside className="flex w-[var(--shell-sidebar-w)] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center px-5">
          <Link href={profile.role === "coach" ? "/coach" : "/dashboard"}>
            <Logo />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-foreground">
            {profile.full_name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {profile.full_name || "Unnamed"}
            </p>
            <p className="truncate text-[11.5px] capitalize text-faint-foreground">
              {profile.role}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex size-7 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
