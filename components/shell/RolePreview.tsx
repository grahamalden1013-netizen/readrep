"use client";

import { useArena } from "@/components/providers/ArenaProvider";
import type { UserRole } from "@/types/ngn";
import { Button, Eyebrow } from "@/components/ui/primitives";

/**
 * Demo-mode role switch.
 *
 * The teacher and admin surfaces are gated behind a role, and in demo mode
 * there is no account system to grant one — so without this they would be
 * reachable only by typing a URL. This makes them discoverable while being
 * explicit that it is a demo affordance, not a permission model. With Supabase
 * configured, the proxy gates these routes properly and this never renders.
 */
export function RolePreview({
  requiredRole,
  surface,
}: {
  requiredRole: UserRole;
  surface: string;
}) {
  const { ready, profile, ensureProfile, updateProfile } = useArena();

  if (!ready) return null;
  if (profile?.role === requiredRole) return null;

  return (
    <div className="mb-8 rounded-sm border border-dashed border-rule-strong bg-paper-sunken/60 p-5">
      <Eyebrow tone="accent">Demo preview</Eyebrow>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
        The {surface} is a {requiredRole} surface. In demo mode there is no
        account system to grant that role, so you can switch into it here to
        look around. With a backend configured, this route is gated at the
        network boundary instead.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            ensureProfile();
            updateProfile({ role: requiredRole });
          }}
        >
          Preview as {requiredRole}
        </Button>
        {profile && profile.role !== "student" && (
          <Button
            size="sm"
            tone="ghost"
            onClick={() => updateProfile({ role: "student" })}
          >
            Back to student
          </Button>
        )}
      </div>
    </div>
  );
}
