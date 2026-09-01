import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { login } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, redirectTo } = await searchParams;
  return (
    <AuthForm
      mode="login"
      action={login}
      error={typeof error === "string" ? error : undefined}
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
