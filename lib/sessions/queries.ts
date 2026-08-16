import { createClient } from "@/lib/supabase/server";
import type { SessionSummary } from "@/types/database";
import type { RosterPlayer } from "@/lib/teams/queries";

type SessionRow = {
  id: string;
  player_id: string;
  assigned_by: string;
  completed_at: string | null;
  created_at: string;
  session_clips: { clips: { games: { title: string } | null } | null }[];
  predictions: { id: string }[];
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
      "id, player_id, assigned_by, completed_at, created_at, session_clips(clips(games(title))), predictions(id)",
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
    completed_count: session.predictions.length,
    game_title: session.session_clips[0]?.clips?.games?.title ?? null,
  }));
}

export type TeamAssignment = {
  id: string;
  playerId: string;
  playerName: string;
  gameTitle: string | null;
  readCount: number;
  completedCount: number;
  completedAt: string | null;
  createdAt: string;
};

type TeamAssignmentRow = {
  id: string;
  player_id: string;
  completed_at: string | null;
  created_at: string;
  session_clips: { clips: { games: { title: string } | null } | null }[];
  predictions: { id: string }[];
};

/**
 * "Assignments" for the coach dashboard — this is the existing `sessions`
 * table reframed, not a new data model. Takes the roster rather than
 * re-fetching it, since callers already have it in hand.
 */
export async function getTeamAssignments(roster: RosterPlayer[]): Promise<TeamAssignment[]> {
  if (roster.length === 0) return [];

  const supabase = await createClient();
  const nameById = new Map(roster.map((p) => [p.id, p.full_name]));

  const { data, error } = await supabase
    .from("sessions")
    .select("id, player_id, completed_at, created_at, session_clips(clips(games(title))), predictions(id)")
    .in("player_id", roster.map((p) => p.id))
    .order("created_at", { ascending: false })
    .returns<TeamAssignmentRow[]>();

  if (error) throw error;

  return data.map((session) => ({
    id: session.id,
    playerId: session.player_id,
    playerName: nameById.get(session.player_id) ?? "Unknown player",
    gameTitle: session.session_clips[0]?.clips?.games?.title ?? null,
    readCount: session.session_clips.length,
    completedCount: session.predictions.length,
    completedAt: session.completed_at,
    createdAt: session.created_at,
  }));
}
