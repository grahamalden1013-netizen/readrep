import { createClient } from "@/lib/supabase/server";

export type RosterPlayer = {
  id: string;
  full_name: string;
  sessionsAssigned: number;
  sessionsCompleted: number;
  predictionsTotal: number;
  predictionsCorrect: number;
};

export type CoachTeam = {
  id: string;
  name: string;
  invite_code: string | null;
  roster: RosterPlayer[];
};

export async function getCoachTeam(): Promise<CoachTeam | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  if (profile.role !== "coach") {
    return null;
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, invite_code")
    .eq("coach_id", user.id)
    .single();

  if (teamError) {
    throw teamError;
  }

  const { data: players, error: playersError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("team_id", team.id)
    .eq("role", "player");

  if (playersError) {
    throw playersError;
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, player_id, completed_at")
    .eq("assigned_by", user.id);

  if (sessionsError) {
    throw sessionsError;
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: predictions, error: predictionsError } = sessionIds.length
    ? await supabase
        .from("predictions")
        .select("player_id, is_correct")
        .in("session_id", sessionIds)
    : { data: [], error: null };

  if (predictionsError) {
    throw predictionsError;
  }

  const roster: RosterPlayer[] = players.map((player) => {
    const playerSessions = sessions.filter((s) => s.player_id === player.id);
    const playerPredictions = (predictions ?? []).filter(
      (p) => p.player_id === player.id,
    );

    return {
      id: player.id,
      full_name: player.full_name,
      sessionsAssigned: playerSessions.length,
      sessionsCompleted: playerSessions.filter((s) => s.completed_at).length,
      predictionsTotal: playerPredictions.length,
      predictionsCorrect: playerPredictions.filter((p) => p.is_correct).length,
    };
  });

  return {
    id: team.id,
    name: team.name,
    invite_code: team.invite_code,
    roster,
  };
}
