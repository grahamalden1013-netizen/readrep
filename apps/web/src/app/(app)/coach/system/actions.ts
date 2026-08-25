"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { saveCoachSystem } from "@/server/dal/coach-system";
import { getCoachTeamId } from "@/server/dal/coach";

const Submission = z.object({
  summary: z.string().trim().max(1200).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(80),
        value: z.string().min(1).max(80),
        followUp: z.string().trim().max(1200).optional(),
      }),
    )
    .min(1)
    .max(40),
});

export type SaveSystemResult =
  { ok: true; revision: number; ruleCount: number } | { ok: false; message: string };

export async function saveCoachSystemAction(input: unknown): Promise<SaveSystemResult> {
  const parsed = Submission.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Answer at least one question before saving." };
  }

  const teamId = await getCoachTeamId();
  if (!teamId) return { ok: false, message: "You do not coach a team." };

  try {
    const result = await saveCoachSystem({ teamId, submission: parsed.data });
    revalidatePath("/coach/system");
    revalidatePath("/coach");
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
