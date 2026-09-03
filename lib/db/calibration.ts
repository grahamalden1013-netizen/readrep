import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import { createClient, requireUserId } from "@/lib/supabase/server";

export type CalibrationReference = {
  id: string;
  timestampSeconds: number;
  point: { x: number; y: number };
  box: { x: number; y: number; w: number; h: number };
  crop: string;
  numberVisible: boolean;
  jerseyColor: string;
};

export type CalibrationLabel = {
  id: string;
  kind: "decision" | "non-decision";
  clipStartSeconds: number;
  decisionSeconds: number | null;
  clipEndSeconds: number;
  targetPoint: { x: number; y: number } | null;
  targetCrop: string | null;
  actualAction: string | null;
  note: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

async function client(): Promise<SupabaseClient> {
  if (!supabaseEnv) throw new Error("Supabase is not configured.");
  const c = await createClient();
  if (!c) throw new Error("Supabase client unavailable.");
  return c as unknown as SupabaseClient;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toRef = (r: any): CalibrationReference => ({
  id: r.id,
  timestampSeconds: r.timestamp_seconds,
  point: r.point,
  box: r.box,
  crop: r.crop,
  numberVisible: r.number_visible,
  jerseyColor: r.jersey_color,
});

const toLabel = (r: any): CalibrationLabel => ({
  id: r.id,
  kind: r.kind,
  clipStartSeconds: r.clip_start_seconds,
  decisionSeconds: r.decision_seconds,
  clipEndSeconds: r.clip_end_seconds,
  targetPoint: r.target_point ?? null,
  targetCrop: r.target_crop ?? null,
  actualAction: r.actual_action ?? null,
  note: r.note ?? null,
  rejectionReason: r.rejection_reason ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const REF_SELECT = "id, timestamp_seconds, point, box, crop, number_visible, jersey_color";
const LABEL_SELECT =
  "id, kind, clip_start_seconds, decision_seconds, clip_end_seconds, target_point, target_crop, actual_action, note, rejection_reason, created_at, updated_at";

export const calibration = {
  async listReferences(gameId: string): Promise<CalibrationReference[]> {
    const c = await client();
    const { data } = await c
      .from("calibration_references")
      .select(REF_SELECT)
      .eq("game_id", gameId)
      .order("timestamp_seconds", { ascending: true });
    return (data ?? []).map(toRef);
  },

  async addReference(
    gameId: string,
    r: Omit<CalibrationReference, "id">,
  ): Promise<CalibrationReference> {
    const c = await client();
    const ownerId = await requireUserId();
    const { data, error } = await c
      .from("calibration_references")
      .insert({
        owner_id: ownerId,
        game_id: gameId,
        timestamp_seconds: r.timestampSeconds,
        point: r.point,
        box: r.box,
        crop: r.crop,
        number_visible: r.numberVisible,
        jersey_color: r.jerseyColor,
      })
      .select(REF_SELECT)
      .single();
    if (error) throw new Error("Could not save the reference.");
    return toRef(data);
  },

  async deleteReference(id: string): Promise<void> {
    const c = await client();
    await c.from("calibration_references").delete().eq("id", id);
  },

  async listLabels(gameId: string): Promise<CalibrationLabel[]> {
    const c = await client();
    const { data } = await c
      .from("calibration_labels")
      .select(LABEL_SELECT)
      .eq("game_id", gameId)
      .order("clip_start_seconds", { ascending: true });
    return (data ?? []).map(toLabel);
  },

  async addLabel(gameId: string, l: Omit<CalibrationLabel, "id" | "createdAt" | "updatedAt">): Promise<CalibrationLabel> {
    const c = await client();
    const ownerId = await requireUserId();
    const { data, error } = await c
      .from("calibration_labels")
      .insert({
        owner_id: ownerId,
        game_id: gameId,
        kind: l.kind,
        clip_start_seconds: l.clipStartSeconds,
        decision_seconds: l.decisionSeconds,
        clip_end_seconds: l.clipEndSeconds,
        target_point: l.targetPoint,
        target_crop: l.targetCrop,
        actual_action: l.actualAction,
        note: l.note,
        rejection_reason: l.rejectionReason,
      })
      .select(LABEL_SELECT)
      .single();
    if (error) throw new Error(error.message || "Could not save the label.");
    return toLabel(data);
  },

  async updateLabel(id: string, patch: Partial<CalibrationLabel>): Promise<CalibrationLabel> {
    const c = await client();
    const row: Record<string, unknown> = {};
    if (patch.clipStartSeconds !== undefined) row.clip_start_seconds = patch.clipStartSeconds;
    if (patch.decisionSeconds !== undefined) row.decision_seconds = patch.decisionSeconds;
    if (patch.clipEndSeconds !== undefined) row.clip_end_seconds = patch.clipEndSeconds;
    if (patch.actualAction !== undefined) row.actual_action = patch.actualAction;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.rejectionReason !== undefined) row.rejection_reason = patch.rejectionReason;
    if (patch.targetPoint !== undefined) row.target_point = patch.targetPoint;
    if (patch.targetCrop !== undefined) row.target_crop = patch.targetCrop;
    const { data, error } = await c
      .from("calibration_labels")
      .update(row)
      .eq("id", id)
      .select(LABEL_SELECT)
      .single();
    if (error) throw new Error(error.message || "Could not update the label.");
    return toLabel(data);
  },

  async deleteLabel(id: string): Promise<void> {
    const c = await client();
    await c.from("calibration_labels").delete().eq("id", id);
  },
};
