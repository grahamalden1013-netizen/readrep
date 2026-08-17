"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { GoogleAuthExpiredError, GoogleNotConnectedError } from "@/lib/google/client";
import { planToday } from "@/lib/planner/schedule";
import { requireUser } from "@/lib/session";
import { NoSchoolCalendarError, refreshPriorities, syncUser } from "@/lib/sync";

/**
 * Every action re-checks the session. Server Actions are reachable by direct
 * POST, so the UI having hidden a button is not authorization.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

function describeError(error: unknown): string {
  if (error instanceof NoSchoolCalendarError) {
    return "No school calendar selected yet. Choose your Schoology calendar first.";
  }
  if (error instanceof GoogleNotConnectedError) {
    return "Google Calendar is not connected.";
  }
  if (error instanceof GoogleAuthExpiredError) {
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export async function syncSchoology(): Promise<
  ActionResult<{ added: number; updated: number; removed: number; busyBlocks: number }>
> {
  const user = await requireUser();

  try {
    const result = await syncUser(user);
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: {
        added: result.added,
        updated: result.updated,
        removed: result.removed,
        busyBlocks: result.busyBlocks,
      },
    };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

// ---------------------------------------------------------------------------
// Completion status
// ---------------------------------------------------------------------------

const statusSchema = z.object({
  assignmentId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE", "SKIPPED"]),
});

/**
 * Records the student's own completion state. This never touches the Google
 * event — the imported Schoology entry is left exactly as it was.
 */
export async function setAssignmentStatus(
  input: z.input<typeof statusSchema>,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status update." };

  // Scoped to the signed-in user, so one account cannot edit another's work.
  const assignment = await prisma.assignment.findFirst({
    where: { id: parsed.data.assignmentId, userId: user.id },
    select: { id: true },
  });
  if (!assignment) return { ok: false, error: "Assignment not found." };

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: parsed.data.status },
  });

  // Finished work should stop occupying the plan.
  if (parsed.data.status === "DONE" || parsed.data.status === "SKIPPED") {
    await prisma.studySession.deleteMany({
      where: {
        userId: user.id,
        assignmentId: assignment.id,
        status: "PLANNED",
      },
    });
  }

  await refreshPriorities(user);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Plan My Day
// ---------------------------------------------------------------------------

export async function planMyDay(): Promise<
  ActionResult<{
    blocks: number;
    scheduledMinutes: number;
    freeMinutes: number;
    deferred: number;
    isLightDay: boolean;
  }>
> {
  const user = await requireUser();

  try {
    await refreshPriorities(user);
    const outcome = await planToday(user);
    revalidatePath("/dashboard");
    return { ok: true, data: outcome };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

// ---------------------------------------------------------------------------
// Study session progress
// ---------------------------------------------------------------------------

const sessionSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(["PLANNED", "COMPLETED", "SKIPPED"]),
});

export async function setSessionStatus(
  input: z.input<typeof sessionSchema>,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid session update." };

  const session = await prisma.studySession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) return { ok: false, error: "Study session not found." };

  await prisma.studySession.update({
    where: { id: session.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
