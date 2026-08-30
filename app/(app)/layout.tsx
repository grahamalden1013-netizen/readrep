import { AppHeader } from "@/components/app/app-header";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logout } from "../(auth)/actions";

/**
 * Deliberately not an auth gate: the demo has to be playable without an
 * account. Signing in only adds identity, it does not unlock the product.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <AppShell>
      <AppHeader email={user?.email ?? null} canSignIn={isSupabaseConfigured} logout={logout} />
      <main className="flex flex-1 flex-col">{children}</main>
    </AppShell>
  );
}
