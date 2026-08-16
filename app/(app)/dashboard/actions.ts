"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function joinTeam(formData: FormData) {
  const supabase = await createClient();
  const code = formData.get("code") as string;

  const { error } = await supabase.rpc("join_team_by_code", { code });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
