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

export type PlayerClip = {
  id: string;
  decision_timestamp_ms: number;
  prompt: string;
  options: string[];
};

export type AnsweredClip = {
  clip_id: string;
  selected_option: string;
  is_correct: boolean;
};

export type SessionDetail = {
  id: string;
  completed_at: string | null;
  video_url: string | null;
  clips: PlayerClip[];
  answered: AnsweredClip[];
};

type SessionDetailRow = {
  id: string;
  completed_at: string | null;
  session_clips: {
    position: number;
    clips: {
      id: string;
      decision_timestamp_ms: number;
      prompt: string;
      options: string[];
      games: { video_url: string } | null;
    } | null;
  }[];
};

export async function getSessionForPlayer(
  sessionId: string,
): Promise<SessionDetail | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, completed_at, session_clips(position, clips(id, decision_timestamp_ms, prompt, options, games(video_url)))",
    )
    .eq("id", sessionId)
    .eq("player_id", user.id)
    .maybeSingle()
    .returns<SessionDetailRow>();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  const orderedClips = session.session_clips
    .filter((sc) => sc.clips !== null)
    .sort((a, b) => a.position - b.position);

  const { data: answered, error: answeredError } = await supabase
    .from("predictions")
    .select("clip_id, selected_option, is_correct")
    .eq("session_id", sessionId)
    .eq("player_id", user.id);

  if (answeredError) {
    throw answeredError;
  }

  return {
    id: session.id,
    completed_at: session.completed_at,
    video_url: orderedClips[0]?.clips?.games?.video_url ?? null,
    clips: orderedClips.map((sc) => ({
      id: sc.clips!.id,
      decision_timestamp_ms: sc.clips!.decision_timestamp_ms,
      prompt: sc.clips!.prompt,
      options: sc.clips!.options,
    })),
    answered: answered ?? [],
  };
}
