import { LogOut, Settings } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { IconButton, IconLinkButton } from "@/components/ui/icon-button";
import type { Profile } from "@/types/database";

export function UserMenu({
  profile,
  teamName,
  settingsHref,
}: {
  profile: Profile;
  teamName?: string | null;
  settingsHref?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-foreground">
        {profile.full_name.trim().charAt(0).toUpperCase() || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {profile.full_name || "Unnamed"}
        </p>
        <p className="truncate text-[11.5px] text-faint-foreground">
          {teamName ?? <span className="capitalize">{profile.role}</span>}
        </p>
      </div>
      {settingsHref && (
        <IconLinkButton href={settingsHref} label="Settings" size="sm">
          <Settings className="size-4" aria-hidden="true" />
        </IconLinkButton>
      )}
      <form action={logout}>
        <IconButton type="submit" label="Log out" size="sm">
          <LogOut className="size-4" aria-hidden="true" />
        </IconButton>
      </form>
    </div>
  );
}
