import { createClient } from "@/lib/supabase/server";
import type { Game, Team } from "@/types/database";

export async function getTeam(teamId: string): Promise<Pick<Team, "name" | "invite_code"> | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("teams")
    .select("name, invite_code")
    .eq("id", teamId)
    .single();

  return data;
}

export type RosterPlayer = { id: string; full_name: string };

export async function getRoster(teamId: string): Promise<RosterPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("team_id", teamId)
    .eq("role", "player")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getTeamGames(teamId: string): Promise<Pick<Game, "id" | "title" | "created_at">[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .select("id, title, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
