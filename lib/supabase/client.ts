import { createBrowserClient } from "@supabase/ssr";
import { NEXTREP_SCHEMA, supabaseEnv } from "@/lib/env";

export function createClient() {
  if (!supabaseEnv) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey, {
    db: { schema: NEXTREP_SCHEMA },
  });
}
