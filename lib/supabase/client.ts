import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

export function createClient() {
  if (!supabaseEnv) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
