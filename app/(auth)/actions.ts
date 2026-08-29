"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NOT_CONFIGURED = "Accounts are not enabled in this environment.";

export async function login(formData: FormData) {
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

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
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

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
