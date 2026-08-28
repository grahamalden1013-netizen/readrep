"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth actions.
 *
 * With no Supabase project configured these send the student into onboarding,
 * which is the demo-mode identity flow. Nothing here collects more than an
 * email and password — no birthday, no real name, no location.
 */

export async function login(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/onboarding");

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/arena");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/onboarding");

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
