import "server-only";
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";
import { NEXTREP_SCHEMA, supabaseEnv } from "@/lib/env";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { ContentBackend } from "./backend";
import { FileContentBackend } from "./file-backend";
import { SupabaseContentBackend } from "./supabase-backend";

export type BackendAvailability =
  | { kind: "supabase"; signedIn: boolean }
  | { kind: "file"; reason: "no-supabase" }
  | { kind: "unavailable"; reason: string };

const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || null;

function fileBackendAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXTREP_ALLOW_FILE_BACKEND === "1";
}

/**
 * Describes where authored content would be stored, without doing any work.
 * Safe to render: a fixture/file run must never look like a durable one.
 */
export async function getBackendAvailability(): Promise<BackendAvailability> {
  if (supabaseEnv) {
    return { kind: "supabase", signedIn: (await getCurrentUser()) !== null };
  }
  if (fileBackendAllowed()) {
    return { kind: "file", reason: "no-supabase" };
  }
  return {
    kind: "unavailable",
    reason:
      "Supabase is not configured and the local file store is disabled outside development, so uploaded games have nowhere durable to live.",
  };
}

/**
 * Backend for a request made by a person. Under Supabase this is the anon key
 * plus their session, so row-level security decides what they can touch.
 */
export async function getBackend(): Promise<ContentBackend> {
  if (supabaseEnv) {
    const client = await createClient();
    if (!client) throw new Error("Supabase is configured but the client could not be created.");
    const user = await getCurrentUser();
    // `db.schema` changes the client's schema type parameter, which the backend
    // does not need to know about — it declares its own row shapes.
    return new SupabaseContentBackend(client as unknown as SupabaseClient, user?.id ?? null);
  }

  if (fileBackendAllowed()) {
    return new FileContentBackend();
  }

  const availability = await getBackendAvailability();
  throw new Error(availability.kind === "unavailable" ? availability.reason : "No backend available.");
}

/**
 * Backend for webhook delivery, which carries no user session. Under Supabase
 * this needs the service role key, since RLS would otherwise hide every row.
 */
export function getWebhookBackend(): ContentBackend {
  if (supabaseEnv) {
    const key = serviceRoleKey();
    if (!key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required to apply webhooks: a webhook has no user session, so row-level security would hide every game.",
      );
    }
    const admin = createSupabaseAdmin(supabaseEnv.url, key, {
      db: { schema: NEXTREP_SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return new SupabaseContentBackend(admin as unknown as SupabaseClient, null);
  }

  if (fileBackendAllowed()) {
    return new FileContentBackend();
  }

  throw new Error("No backend available to apply webhooks.");
}

/**
 * Backend if one is available, null otherwise. Read paths use this so the
 * seeded demo keeps working with no configuration; write paths use
 * `getBackend()` and fail loudly instead.
 */
export async function tryGetBackend(): Promise<ContentBackend | null> {
  const availability = await getBackendAvailability();
  if (availability.kind === "unavailable") return null;
  return getBackend();
}

export type { ContentBackend };
