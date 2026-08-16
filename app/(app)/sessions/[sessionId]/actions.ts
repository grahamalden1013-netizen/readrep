"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PredictionResult =
  | {
      ok: true;
      isCorrect: boolean;
      correctOption: string;
      feedback: string;
      sessionCompleted: boolean;
    }
  | { ok: false; message: string };

export async function submitPrediction(
  sessionId: string,
  clipId: string,
  selectedOption: string,
): Promise<PredictionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: membership } = await supabase
    .from("session_clips")
    .select("clip_id")
    .eq("session_id", sessionId)
    .eq("clip_id", clipId)
    .maybeSingle();

  if (!membership) return { ok: false, message: "That clip isn't part of this session." };

  // Correctness is decided here, not in the browser.
  const { data: clip } = await supabase
    .from("clips")
    .select("correct_option, feedback")
    .eq("id", clipId)
    .single();

  if (!clip) return { ok: false, message: "Clip not found." };

  const isCorrect = selectedOption === clip.correct_option;

  const { error: insertError } = await supabase.from("predictions").insert({
    session_id: sessionId,
    clip_id: clipId,
    player_id: user.id,
    selected_option: selectedOption,
    is_correct: isCorrect,
  });

  // A duplicate answer (unique session_id+clip_id) still reveals the result
  // rather than erroring — the player already committed to a read.
  if (insertError && insertError.code !== "23505") {
    return { ok: false, message: insertError.message };
  }

  const [{ count: clipCount }, { count: predictionCount }] = await Promise.all([
    supabase
      .from("session_clips")
      .select("clip_id", { count: "exact", head: true })
      .eq("session_id", sessionId),
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  let sessionCompleted = false;
  if (clipCount !== null && predictionCount !== null && predictionCount >= clipCount) {
    await supabase
      .from("sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .is("completed_at", null);
    sessionCompleted = true;
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");

  return {
    ok: true,
    isCorrect,
    correctOption: clip.correct_option,
    feedback: clip.feedback,
    sessionCompleted,
  };
}
