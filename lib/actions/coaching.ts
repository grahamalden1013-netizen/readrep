"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  COACHING_QUESTIONS,
  coachingAnswersSchema,
  isProfileComplete,
} from "@/lib/coaching/profile";
import { getCoachingProfile, saveCoachingProfile } from "@/lib/db/coaching-profile";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const inputSchema = z.object({
  answers: coachingAnswersSchema,
});

export async function saveCoachingSurvey(input: {
  answers: Record<string, string>;
}): Promise<ActionResult<{ complete: boolean }>> {
  return withAuthedAction(async () => {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Some answers were not recognised." };
    await requireOwnerWhenSupabase();

    const answers = parsed.data.answers;
    const complete = COACHING_QUESTIONS.every((q) => typeof answers[q.id] === "string");
    const saved = await saveCoachingProfile(answers, complete);

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: { complete: isProfileComplete(saved) } };
  });
}

/** Server-component read helper. */
export async function loadCoachingProfile() {
  return getCoachingProfile();
}
