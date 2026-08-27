import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initialsOf } from "@/lib/utils";

/**
 * Reader identity.
 *
 * Privacy note: NGN readers may be minors. A viewer object never carries an
 * email address, a precise location, or a school name that other readers can
 * see — only what the reader chose to display.
 */
export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  hue: number;
  gradeLabel?: string;
  schoolLabel?: string;
  joinedAt: string;
  role: "reader" | "editor";
  /** True for the cookie-based session used when Supabase is not configured. */
  isDemo: boolean;
}

export const DEMO_SESSION_COOKIE = "ngn_demo_session";

function hueFor(seed: string) {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) total += seed.charCodeAt(i);
  return total % 360;
}

export async function getViewer(): Promise<Viewer | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    const user = data?.user;
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const displayName = meta.display_name || meta.username || "NGN reader";
      return {
        id: user.id,
        username: meta.username || user.id.slice(0, 8),
        displayName,
        initials: initialsOf(displayName),
        hue: hueFor(user.id),
        gradeLabel: meta.grade,
        schoolLabel: meta.school,
        joinedAt: user.created_at ?? new Date().toISOString(),
        role: meta.role === "editor" ? "editor" : "reader",
        isDemo: false,
      };
    }
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      displayName: string;
      username: string;
      grade?: string;
      school?: string;
      role?: string;
      joinedAt?: string;
    };
    return {
      id: `demo-${parsed.username}`,
      username: parsed.username,
      displayName: parsed.displayName,
      initials: initialsOf(parsed.displayName),
      hue: hueFor(parsed.username),
      gradeLabel: parsed.grade,
      schoolLabel: parsed.school,
      joinedAt: parsed.joinedAt ?? new Date().toISOString(),
      role: parsed.role === "editor" ? "editor" : "reader",
      isDemo: true,
    };
  } catch {
    return null;
  }
}

export async function requireViewer(): Promise<Viewer | null> {
  return getViewer();
}
