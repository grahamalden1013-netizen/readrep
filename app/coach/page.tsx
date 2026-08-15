import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { LogoutButton } from "@/components/logout-button";

export default async function CoachDashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "player") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: team }, { data: roster }, { data: games }] =
    await Promise.all([
      profile.team_id
        ? supabase
            .from("teams")
            .select("name, invite_code")
            .eq("id", profile.team_id)
            .single()
        : Promise.resolve({ data: null }),
      profile.team_id
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .eq("team_id", profile.team_id)
            .eq("role", "player")
        : Promise.resolve({ data: null }),
      profile.team_id
        ? supabase
            .from("games")
            .select("id, title, created_at")
            .eq("team_id", profile.team_id)
            .order("created_at", { ascending: false })
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
            {team?.name ?? "No team yet"}
          </p>
        </div>
        <LogoutButton />
      </div>

      {team?.invite_code && (
        <section className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 dark:border-white/[.145]">
          <div>
            <h2 className="text-sm font-medium">Team invite code</h2>
            <p className="text-xs text-zinc-500">
              Share this with your players so they can join from signup or
              their dashboard.
            </p>
          </div>
          <code className="rounded bg-black/[.06] px-3 py-1.5 font-mono text-sm tracking-wider dark:bg-white/[.08]">
            {team.invite_code}
          </code>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Roster</h2>

        {roster && roster.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {roster.map((player) => (
              <li
                key={player.id}
                className="rounded border border-zinc-200 px-4 py-3 text-sm dark:border-white/[.145]"
              >
                {player.full_name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.145]">
            No players on your roster yet.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Games</h2>

        {games && games.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {games.map((game) => (
              <li
                key={game.id}
                className="rounded border border-zinc-200 px-4 py-3 text-sm dark:border-white/[.145]"
              >
                {game.title} &middot;{" "}
                {new Date(game.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.145]">
            No games uploaded yet.
          </p>
        )}
      </section>
    </div>
  );
}
