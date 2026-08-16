import {
  ClipboardList,
  Film,
  LayoutDashboard,
  PlaySquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Profile } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

/**
 * "Team" and "Players" both appeared in the original nav spec, but there's
 * no distinct data to justify two destinations — they're merged into one
 * real Team page rather than shipping a second view of the same roster.
 */
export function getNavItems(role: Profile["role"]): NavItem[] {
  if (role === "coach") {
    return [
      { href: "/coach", label: "Dashboard", icon: LayoutDashboard },
      { href: "/coach/games", label: "Games", icon: Film },
      { href: "/coach/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/coach/team", label: "Team", icon: Users },
      { href: "/coach/review", label: "Review", icon: PlaySquare, soon: true },
      { href: "/coach/settings", label: "Settings", icon: Settings, soon: true },
    ];
  }

  return [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
}
