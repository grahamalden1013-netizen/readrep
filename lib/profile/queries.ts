import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, team_id, created_at")
    .eq("id", user.id)
    .single();

  return profile;
});

export function homePathForRole(role: Profile["role"]) {
  return role === "coach" ? "/coach" : "/dashboard";
}
