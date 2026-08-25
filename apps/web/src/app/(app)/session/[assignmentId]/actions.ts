"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  completeSession,
  type RevealDTO,
  submitDecision,
  submitReflection,
} from "@/server/dal/player";

/**
 * Session Server Actions.
 *
 * Thin by design: validate the input with a schema, then hand off to the
 * data-access layer, which re-verifies the caller against the resource. A
 * Server Action is a public POST endpoint whether or not the interface links to
 * it, so none of these trust their arguments and none of them assume a page
 * already checked anything.
 */

const Id = z.string().min(1).max(120);

const ResponseInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), optionId: Id }),
  z.object({ type: z.literal("select_player"), trackId: Id }),
  z.object({
    type: z.literal("select_court_area"),
    area: z.enum([
      "left_corner",
      "right_corner",
      "left_wing",
      "right_wing",
      "top_of_key",
      "left_elbow",
      "right_elbow",
      "paint",
      "restricted_area",
      "short_corner",
      "backcourt",
    ]),
  }),
  z.object({ type: z.literal("short_text"), text: z.string().trim().min(1).max(600) }),
]);

const DecisionInput = z.object({
  assignmentId: Id,
  momentId: Id,
  response: ResponseInput,
  timeToDecideMs: z.number().int().nonnegative().max(3_600_000).nullable(),
});

export type DecisionResult =
  { ok: true; reveal: RevealDTO } | { ok: false; message: string };

export async function submitDecisionAction(input: unknown): Promise<DecisionResult> {
  const parsed = DecisionInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That answer could not be read. Try again." };
  }

  try {
    const reveal = await submitDecision({
      assignmentId: parsed.data.assignmentId as never,
      momentId: parsed.data.momentId as never,
      response: parsed.data.response as never,
      timeToDecideMs: parsed.data.timeToDecideMs,
    });
    // Deliberately no revalidatePath here. Refreshing the page a player is
    // standing on would re-render the session with this moment now marked
    // complete, which remounts the rep and destroys the reveal before they have
    // read it. The dashboard is revalidated when the session finishes instead.
    return { ok: true, reveal };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

const ReflectionInput = z.object({
  attemptId: Id,
  missedCue: z.string().trim().max(600).nullable(),
  revisit: z.boolean(),
});

export async function submitReflectionAction(
  input: unknown,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = ReflectionInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "That reflection could not be saved." };

  try {
    await submitReflection({
      attemptId: parsed.data.attemptId,
      missedCue: parsed.data.missedCue?.trim() || null,
      revisit: parsed.data.revisit,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function completeSessionAction(
  assignmentId: unknown,
): Promise<{ ok: boolean }> {
  const parsed = Id.safeParse(assignmentId);
  if (!parsed.success) return { ok: false };
  await completeSession(parsed.data as never);
  revalidatePath("/player");
  revalidatePath(`/session/${parsed.data}`);
  return { ok: true };
}
