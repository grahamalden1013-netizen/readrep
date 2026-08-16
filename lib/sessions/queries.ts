import { createClient } from "@/lib/supabase/server";
import type { SessionSummary } from "@/types/database";

type SessionRow = {
  id: string;
  player_id: string;
  assigned_by: string;
  completed_at: string | null;
  created_at: string;
  session_clips: { clips: { games: { title: string } | null } | null }[];
};

export async function getAssignedSessions(): Promise<SessionSummary[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, player_id, assigned_by, completed_at, created_at, session_clips(clips(games(title)))",
    )
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SessionRow[]>();

  if (error) {
    throw error;
  }

  return data.map((session) => ({
    id: session.id,
    player_id: session.player_id,
    assigned_by: session.assigned_by,
    completed_at: session.completed_at,
    created_at: session.created_at,
    clip_count: session.session_clips.length,
    game_title: session.session_clips[0]?.clips?.games?.title ?? null,
  }));
}
