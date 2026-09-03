"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DECISION_ACTIONS } from "@/lib/ai/game-analysis/schema";
import { calibration, type CalibrationLabel, type CalibrationReference } from "@/lib/db/calibration";
import { getGame } from "@/lib/store";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const gameIdSchema = z.string().min(1).max(64);
const idSchema = z.string().min(1).max(64);
const dataUrl = z.string().regex(/^data:image\/(webp|jpeg|png);base64,/).max(300_000);
const xy = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
const box = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.02).max(1),
  h: z.number().min(0.02).max(1),
});

async function assertOwner(gameId: string): Promise<{ ok: false; error: string } | null> {
  await requireOwnerWhenSupabase();
  const game = await getGame(gameId); // RLS-scoped: only the owner sees it
  if (!game) return { ok: false, error: "That game could not be found." };
  return null;
}

// --- references -----------------------------------------------------
const refSchema = z.object({
  gameId: gameIdSchema,
  timestampSeconds: z.number().nonnegative(),
  point: xy,
  box,
  crop: dataUrl,
  numberVisible: z.boolean(),
  jerseyColor: z.string().trim().min(2).max(24),
});

export async function saveCalibrationReference(
  input: z.input<typeof refSchema>,
): Promise<ActionResult<{ reference: CalibrationReference }>> {
  return withAuthedAction(async () => {
    const parsed = refSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Check the reference and try again." };
    const guard = await assertOwner(parsed.data.gameId);
    if (guard) return guard;
    const { gameId, ...r } = parsed.data;
    const reference = await calibration.addReference(gameId, r);
    revalidatePath(`/games/${gameId}/calibrate`);
    return { ok: true, data: { reference } };
  });
}

export async function deleteCalibrationReference(gameId: string, id: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    const guard = await assertOwner(gameId);
    if (guard) return guard;
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Not found." };
    await calibration.deleteReference(id);
    revalidatePath(`/games/${gameId}/calibrate`);
    return { ok: true, data: null };
  });
}

// --- labels --------------------------------------------------------
const labelSchema = z
  .object({
    gameId: gameIdSchema,
    kind: z.enum(["decision", "non-decision"]),
    clipStartSeconds: z.number().nonnegative(),
    decisionSeconds: z.number().nonnegative().nullable(),
    clipEndSeconds: z.number().nonnegative(),
    targetPoint: xy.nullable().optional(),
    targetCrop: dataUrl.nullable().optional(),
    actualAction: z.enum(DECISION_ACTIONS).nullable().optional(),
    note: z.string().trim().max(600).nullable().optional(),
    rejectionReason: z.string().trim().max(300).nullable().optional(),
  })
  .refine((l) => l.clipStartSeconds < l.clipEndSeconds, { message: "Clip end must come after clip start." })
  .refine(
    (l) =>
      l.kind !== "decision" ||
      (l.decisionSeconds !== null &&
        l.clipStartSeconds < l.decisionSeconds &&
        l.decisionSeconds < l.clipEndSeconds),
    { message: "The decision point must sit inside the clip." },
  )
  .refine((l) => l.kind !== "decision" || Boolean(l.actualAction), { message: "Pick the action the player committed to." })
  .refine((l) => l.kind !== "non-decision" || Boolean(l.rejectionReason?.trim()), {
    message: "Give a reason this is not a decision.",
  });

export async function saveCalibrationLabel(
  input: z.input<typeof labelSchema>,
): Promise<ActionResult<{ label: CalibrationLabel }>> {
  return withAuthedAction(async () => {
    const parsed = labelSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the label." };
    const guard = await assertOwner(parsed.data.gameId);
    if (guard) return guard;
    const { gameId, ...l } = parsed.data;
    const label = await calibration.addLabel(gameId, {
      kind: l.kind,
      clipStartSeconds: l.clipStartSeconds,
      decisionSeconds: l.decisionSeconds,
      clipEndSeconds: l.clipEndSeconds,
      targetPoint: l.targetPoint ?? null,
      targetCrop: l.targetCrop ?? null,
      actualAction: l.actualAction ?? null,
      note: l.note ?? null,
      rejectionReason: l.rejectionReason ?? null,
    });
    revalidatePath(`/games/${gameId}/calibrate`);
    return { ok: true, data: { label } };
  });
}

const editSchema = z.object({
  gameId: gameIdSchema,
  id: idSchema,
  clipStartSeconds: z.number().nonnegative().optional(),
  decisionSeconds: z.number().nonnegative().nullable().optional(),
  clipEndSeconds: z.number().nonnegative().optional(),
  actualAction: z.enum(DECISION_ACTIONS).nullable().optional(),
  note: z.string().trim().max(600).nullable().optional(),
  rejectionReason: z.string().trim().max(300).nullable().optional(),
});

export async function updateCalibrationLabel(input: z.input<typeof editSchema>): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Check your edits." };
    const guard = await assertOwner(parsed.data.gameId);
    if (guard) return guard;
    const { gameId, id, ...patch } = parsed.data;
    await calibration.updateLabel(id, patch);
    revalidatePath(`/games/${gameId}/calibrate`);
    return { ok: true, data: null };
  });
}

export async function deleteCalibrationLabel(gameId: string, id: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    const guard = await assertOwner(gameId);
    if (guard) return guard;
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Not found." };
    await calibration.deleteLabel(id);
    revalidatePath(`/games/${gameId}/calibrate`);
    return { ok: true, data: null };
  });
}

export async function loadCalibration(gameId: string) {
  const [references, labels] = await Promise.all([
    calibration.listReferences(gameId),
    calibration.listLabels(gameId),
  ]);
  return { references, labels };
}
