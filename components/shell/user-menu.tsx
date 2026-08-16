import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-foreground">
        {profile.full_name.trim().charAt(0).toUpperCase() || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {profile.full_name || "Unnamed"}
        </p>
        <p className="truncate text-[11.5px] capitalize text-faint-foreground">{profile.role}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex size-7 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
