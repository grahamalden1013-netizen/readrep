import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { signup } from "../actions";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error, redirectTo } = await searchParams;
  return (
    <AuthForm
      mode="signup"
      action={signup}
      error={typeof error === "string" ? error : undefined}
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
