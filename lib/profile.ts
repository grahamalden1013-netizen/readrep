import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "player" | "coach";
  full_name: string;
  team_id: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, team_id")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}
