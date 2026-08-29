import { z } from "zod";

/**
 * Supabase is optional in V1. The seeded demo has to run with no configuration
 * at all, so nothing may throw at import time when these are absent.
 */
const supabaseEnvSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

const parsed = supabaseEnvSchema.safeParse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const supabaseEnv: SupabaseEnv | null = parsed.success ? parsed.data : null;

export const isSupabaseConfigured = supabaseEnv !== null;
