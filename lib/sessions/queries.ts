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

export type ResultClip = {
  id: string;
  prompt: string;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean | null;
  feedback: string;
};

export type SessionResults = {
  id: string;
  completed_at: string | null;
  clips: ResultClip[];
};

type ResultsRow = {
  id: string;
  completed_at: string | null;
  session_clips: {
    position: number;
    clips: {
      id: string;
      prompt: string;
      correct_option: string;
      feedback: string;
    } | null;
  }[];
};

export async function getSessionResults(
  sessionId: string,
): Promise<SessionResults | null> {
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
      "id, completed_at, session_clips(position, clips(id, prompt, correct_option, feedback))",
    )
    .eq("id", sessionId)
    .eq("player_id", user.id)
    .maybeSingle()
    .returns<ResultsRow>();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("clip_id, selected_option, is_correct")
    .eq("session_id", sessionId)
    .eq("player_id", user.id);

  if (predictionsError) {
    throw predictionsError;
  }

  const predictionByClip = new Map(
    (predictions ?? []).map((p) => [p.clip_id, p]),
  );

  const orderedClips = session.session_clips
    .filter((sc) => sc.clips !== null)
    .sort((a, b) => a.position - b.position);

  return {
    id: session.id,
    completed_at: session.completed_at,
    clips: orderedClips.map((sc) => {
      const prediction = predictionByClip.get(sc.clips!.id);
      return {
        id: sc.clips!.id,
        prompt: sc.clips!.prompt,
        selected_option: prediction?.selected_option ?? null,
        correct_option: sc.clips!.correct_option,
        is_correct: prediction?.is_correct ?? null,
        feedback: sc.clips!.feedback,
      };
    }),
  };
}
