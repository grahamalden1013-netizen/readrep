"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/server/dal/auth-actions";
import { getCurrentUser } from "@/server/auth/authorize";

/**
 * Server Actions are thin: validate, delegate to the data-access layer, redirect.
 * The authentication work itself, and every check around it, lives in the DAL.
 */

export type SignInState = { message: string | null };

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const result = await signIn({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return { message: result.message };
  redirect("/player");
}

export async function signOutAction(): Promise<void> {
  const user = await getCurrentUser();
  await signOut(user?.id ?? null);
  redirect("/sign-in");
}
