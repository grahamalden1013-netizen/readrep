/**
 * Supabase is optional.
 *
 * NGN must run end to end with no backend configured — that is how the demo
 * works and how a contributor gets started. Every Supabase entry point checks
 * this first, so a missing env var degrades to demo mode rather than throwing
 * on every request.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}
