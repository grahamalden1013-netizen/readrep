"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAssignment, submitReview } from "@/server/dal/review";

const Id = z.string().min(1).max(120);

const ReviewInput = z.object({
  candidateId: Id,
  verdict: z.enum(["approved", "rejected", "needs_more_evidence"]),
  preferredOptionId: Id.nullable(),
  category: z.string().min(1).max(80).nullable(),
  editedVisualCue: z.string().trim().min(1).max(400).nullable(),
  editedTeachingCue: z.string().trim().min(1).max(400).nullable(),
  note: z.string().trim().max(1200).nullable(),
  confidenceScore: z.number().min(0).max(1),
  confidenceBasis: z.string().trim().min(1).max(280),
  rejectionReason: z
    .enum([
      "not_a_real_decision",
      "wrong_player",
      "wrong_category",
      "not_visible_enough",
      "contradicts_our_system",
      "too_similar_to_another_moment",
      "not_useful_for_this_player",
      "other",
    ])
    .nullable(),
  rejectionDetail: z.string().trim().max(600).nullable(),
});

export type ReviewActionResult =
  { ok: true; momentId: string | null } | { ok: false; message: string };

export async function submitReviewAction(input: unknown): Promise<ReviewActionResult> {
  const parsed = ReviewInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That review could not be read. Check the form." };
  }
  if (parsed.data.verdict === "rejected" && parsed.data.rejectionReason === null) {
    return { ok: false, message: "Choose a reason so proposals can improve." };
  }

  try {
    const result = await submitReview({
      ...parsed.data,
      candidateId: parsed.data.candidateId as never,
    });
    revalidatePath("/coach/review");
    revalidatePath("/coach");
    return { ok: true, momentId: result.momentId };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

const AssignInput = z.object({
  teamId: Id,
  playerId: Id,
  title: z.string().trim().min(1).max(120),
  momentIds: z.array(Id).min(1).max(20),
  /** ISO-8601 instant, or null. Optional by design: a due date is a nudge. */
  dueAt: z.string().datetime({ offset: true }).nullable(),
  /** Minted once per form so a double-click cannot create two assignments. */
  idempotencyKey: z.string().min(8).max(120),
});

export type AssignActionResult =
  | { ok: true; assignmentId: string; deduplicated: boolean }
  | { ok: false; message: string };

export async function createAssignmentAction(
  input: unknown,
): Promise<AssignActionResult> {
  const parsed = AssignInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That assignment could not be read. Check the form." };
  }

  try {
    const result = await createAssignment({
      teamId: parsed.data.teamId as never,
      playerId: parsed.data.playerId as never,
      title: parsed.data.title,
      momentIds: parsed.data.momentIds,
      dueAt: parsed.data.dueAt,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    // The player's dashboard and queue must show this immediately.
    revalidatePath("/player");
    revalidatePath("/coach");
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
