"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGame(formData: FormData) {
  const supabase = await createClient();
  const title = formData.get("title") as string;
  const videoUrl = formData.get("video_url") as string;
  const teamId = formData.get("team_id") as string;

  const { error } = await supabase.from("games").insert({
    title,
    video_url: videoUrl,
    team_id: teamId,
  });

  if (error) {
    redirect(`/coach/games/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/coach/games");
}
