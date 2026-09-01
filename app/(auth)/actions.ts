"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NOT_CONFIGURED = "Accounts are not enabled in this environment.";

/**
 * Only same-origin absolute paths are honoured, so `redirectTo` cannot be used
 * to bounce a user to another site after login.
 */
function safeRedirectTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function login(formData: FormData) {
  const destination = safeRedirectTo(formData.get("redirectTo"));
  const supabase = await createClient();
  if (!supabase) {
    redirect(`/login?error=${encodeURIComponent(NOT_CONFIGURED)}`);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(destination);
}

export async function signup(formData: FormData) {
  const destination = safeRedirectTo(formData.get("redirectTo"));
  const supabase = await createClient();
  if (!supabase) {
    redirect(`/signup?error=${encodeURIComponent(NOT_CONFIGURED)}`);
  }

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
