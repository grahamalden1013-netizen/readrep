import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import { createClient, requireUserId } from "@/lib/supabase/server";
import {
  COACHING_PROFILE_VERSION,
  coachingAnswersSchema,
  type CoachingAnswers,
  type CoachingProfile,
} from "@/lib/coaching/profile";

type Row = {
  owner_id: string;
  schema_version: number;
  answers: unknown;
  completed_at: string | null;
};

async function client(): Promise<SupabaseClient | null> {
  if (!supabaseEnv) return null;
  const c = await createClient();
  return c ? (c as unknown as SupabaseClient) : null;
}

/** The signed-in coach's profile, or null. RLS scopes this to `auth.uid()`. */
export async function getCoachingProfile(): Promise<CoachingProfile | null> {
  const c = await client();
  if (!c) return null;
  const { data } = await c
    .from("coaching_profiles")
    .select("owner_id, schema_version, answers, completed_at")
    .maybeSingle<Row>();
  if (!data) return null;
  const parsed = coachingAnswersSchema.safeParse(data.answers ?? {});
  return {
    schemaVersion: data.schema_version,
    answers: parsed.success ? parsed.data : {},
    completedAt: data.completed_at,
  };
}

/** Upsert the coach's answers. `completed` stamps completed_at once every question is answered. */
export async function saveCoachingProfile(
  answers: CoachingAnswers,
  completed: boolean,
): Promise<CoachingProfile> {
  const c = await client();
  if (!c) throw new Error("Supabase is not configured.");
  const ownerId = await requireUserId();

  const { data, error } = await c
    .from("coaching_profiles")
    .upsert(
      {
        owner_id: ownerId,
        schema_version: COACHING_PROFILE_VERSION,
        answers,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "owner_id" },
    )
    .select("owner_id, schema_version, answers, completed_at")
    .single<Row>();
  if (error) throw new Error("Could not save the coaching profile.");

  const parsed = coachingAnswersSchema.safeParse(data.answers ?? {});
  return {
    schemaVersion: data.schema_version,
    answers: parsed.success ? parsed.data : {},
    completedAt: data.completed_at,
  };
}
