/**
 * Supabase is optional in this build. Every call site checks this first so the
 * product runs end-to-end with no credentials configured.
 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const SUPABASE_SETUP_HINT =
  "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then run supabase/schema.sql.";
