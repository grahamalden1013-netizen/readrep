import { createClient } from "@/lib/supabase/server";

export type SessionClipDetail = {
  clipId: string;
  position: number;
  decisionTimestampMs: number;
  prompt: string;
  options: string[];
  videoUrl: string;
  gameTitle: string;
  // Populated only for clips the player has already answered — the reveal
  // fields for unanswered clips stay server-side until a prediction exists.
  answered: {
    selectedOption: string;
    isCorrect: boolean;
    correctOption: string;
    feedback: string;
  } | null;
};

export type SessionDetail = {
  id: string;
  completedAt: string | null;
  gameTitle: string | null;
  clips: SessionClipDetail[];
};

type ClipRow = {
  position: number;
  clips: {
    id: string;
    decision_timestamp_ms: number;
    prompt: string;
    options: string[];
    correct_option: string;
    feedback: string;
    games: { title: string; video_url: string } | null;
  } | null;
};

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, completed_at")
    .eq("id", sessionId)
    .single();

  if (!session) return null;

  const [{ data: clipRows, error: clipsError }, { data: predictions, error: predsError }] =
    await Promise.all([
      supabase
        .from("session_clips")
        .select(
          "position, clips(id, decision_timestamp_ms, prompt, options, correct_option, feedback, games(title, video_url))",
        )
        .eq("session_id", sessionId)
        .order("position", { ascending: true })
        .returns<ClipRow[]>(),
      supabase
        .from("predictions")
        .select("clip_id, selected_option, is_correct")
        .eq("session_id", sessionId),
    ]);

  if (clipsError) throw clipsError;
  if (predsError) throw predsError;

  const predictionByClip = new Map(predictions.map((p) => [p.clip_id, p]));

  const clips: SessionClipDetail[] = clipRows
    .filter((row): row is ClipRow & { clips: NonNullable<ClipRow["clips"]> } => row.clips !== null)
    .map((row) => {
      const prediction = predictionByClip.get(row.clips.id);
      return {
        clipId: row.clips.id,
        position: row.position,
        decisionTimestampMs: row.clips.decision_timestamp_ms,
        prompt: row.clips.prompt,
        options: row.clips.options,
        videoUrl: row.clips.games?.video_url ?? "",
        gameTitle: row.clips.games?.title ?? "Untitled game",
        answered: prediction
          ? {
              selectedOption: prediction.selected_option,
              isCorrect: prediction.is_correct,
              correctOption: row.clips.correct_option,
              feedback: row.clips.feedback,
            }
          : null,
      };
    });

  return {
    id: session.id,
    completedAt: session.completed_at,
    gameTitle: clips[0]?.gameTitle ?? null,
    clips,
  };
}
