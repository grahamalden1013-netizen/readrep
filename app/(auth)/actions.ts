"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const ONE_WEEK = 60 * 60 * 24 * 7;

function safeRedirect(target: FormDataEntryValue | null) {
  const value = typeof target === "string" ? target : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(formData: FormData) {
  const redirectTo = safeRedirect(formData.get("redirectTo"));

  if (!isSupabaseConfigured()) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Email sign-in needs a Supabase project. Use the demo reader session below to explore NGN.",
      )}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase!.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  redirect(redirectTo);
}

export async function signup(formData: FormData) {
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!isSupabaseConfigured()) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Account creation needs a Supabase project. Use the demo reader session below to explore NGN.",
      )}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase!.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      data: {
        display_name: displayName,
        username: slugify(username || displayName),
        // School and grade stay optional and are never shown publicly.
        school: String(formData.get("school") ?? "").trim() || undefined,
        grade: String(formData.get("grade") ?? "").trim() || undefined,
      },
    },
  });

  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  redirect(redirectTo);
}

/**
 * Demo reader session.
 *
 * Not authentication — a signed-out convenience so reactions, comments and the
 * newsroom are explorable before Supabase is connected. It stores a display
 * name and nothing else.
 */
export async function startDemoSession(formData: FormData) {
  const redirectTo = safeRedirect(formData.get("redirectTo"));
  const displayName =
    String(formData.get("displayName") ?? "").trim() || "Demo reader";
  const role = formData.get("role") === "editor" ? "editor" : "reader";

  const cookieStore = await cookies();
  cookieStore.set(
    DEMO_SESSION_COOKIE,
    encodeURIComponent(
      JSON.stringify({
        displayName,
        username: slugify(displayName) || "demo-reader",
        grade: String(formData.get("grade") ?? "").trim() || undefined,
        school: String(formData.get("school") ?? "").trim() || undefined,
        role,
        joinedAt: new Date().toISOString(),
      }),
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_WEEK,
    },
  );

  redirect(redirectTo);
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase?.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  redirect("/");
}
