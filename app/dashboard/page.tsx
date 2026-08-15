import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "coach") {
    redirect("/coach");
  }

  const supabase = await createClient();

  const [{ data: sessions }, { data: team }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, completed_at, created_at")
      .eq("player_id", profile.id)
      .order("created_at", { ascending: false }),
    profile.team_id
      ? supabase.from("teams").select("name").eq("id", profile.team_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-12 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {team?.name ?? "You haven't joined a team yet."}
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Your film sessions</h2>

        {sessions && sessions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="rounded border border-zinc-200 px-4 py-3 text-sm dark:border-white/[.145]"
              >
                {session.completed_at ? "Completed" : "Not started"} &middot;{" "}
                {new Date(session.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.145]">
            No film sessions assigned yet. Check back once your coach assigns
            one.
          </p>
        )}
      </section>
    </div>
  );
}
