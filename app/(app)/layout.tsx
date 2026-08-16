import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/profile/queries";
import { getTeam } from "@/lib/teams/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const team = profile.team_id ? await getTeam(profile.team_id) : null;
  const homeHref = homePathForRole(profile.role);

  return (
    <div className="flex min-h-svh w-full flex-col md:flex-row">
      <Sidebar profile={profile} teamName={team?.name} homeHref={homeHref} />
      <MobileNav profile={profile} teamName={team?.name} homeHref={homeHref} />
      <main className="min-w-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
