"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Picks the shell for the current application route.
 *
 * The film room is dark because reviewing film is a dark-room task: a bright
 * surround flattens the perceived contrast of the frame you are trying to read.
 * It is confined to the two routes where a video is the object of the work.
 */
const FILM_ROUTES = [/^\/sessions\/[^/]+$/, /^\/studio\/[^/]+$/];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const film = FILM_ROUTES.some((pattern) => pattern.test(pathname));

  return (
    <div
      className={`is-document flex flex-1 flex-col ${film ? "shell-film" : "shell-app"}`}
    >
      {children}
    </div>
  );
}
