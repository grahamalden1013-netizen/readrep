"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitPrediction(
  sessionId: string,
  clipId: string,
  selectedOption: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("correct_option, feedback")
    .eq("id", clipId)
    .single();

  if (clipError) {
    throw clipError;
  }

  const isCorrect = selectedOption === clip.correct_option;

  const { error: insertError } = await supabase.from("predictions").insert({
    session_id: sessionId,
    clip_id: clipId,
    player_id: user.id,
    selected_option: selectedOption,
    is_correct: isCorrect,
  });

  if (insertError) {
    throw insertError;
  }

  return {
    isCorrect,
    correctOption: clip.correct_option as string,
    feedback: clip.feedback as string,
  };
}

export async function completeSession(sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/sessions/${sessionId}`);
}
