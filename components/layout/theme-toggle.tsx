"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/client/browser-stores";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className={cn(
        "grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-[1.05rem]" />
      ) : (
        <Moon className="size-[1.05rem]" />
      )}
    </button>
  );
}
