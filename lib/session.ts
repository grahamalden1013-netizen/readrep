import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePreferences, type Preferences } from "@/lib/preferences";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  timezone: string;
  preferences: Preferences;
};

/**
 * Reads the session from the request cookie. Cached per-request so multiple
 * components can call it without repeated database round-trips.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Loads the signed-in user, or null. Reads the user row directly rather than
 * trusting session-embedded fields, so preference edits take effect at once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      timezone: true,
      preferences: true,
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    timezone: user.timezone,
    preferences: parsePreferences(user.preferences),
  };
});

/**
 * Server-side guard for authenticated pages and Server Actions. Every Server
 * Action must call this — actions are reachable by direct POST, not only
 * through our UI.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
