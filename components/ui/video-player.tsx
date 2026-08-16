"use client";

import { useState } from "react";
import { Pause, Play, Volume2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Presentational chrome for the film player — establishes how "pause at the
 * decision point, predict, reveal" should look and feel. Not wired to a real
 * <video> element or Supabase data yet; that's the actual session-player
 * feature (see the roadmap), which needs a real clip and timestamp to work
 * against. This component exists so the visual language is decided before
 * that logic is built on top of it.
 */
export function VideoPlayerDemo({ className }: { className?: string }) {
  const [state, setState] = useState<"playing" | "decision">("decision");

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-xl border border-border-strong bg-surface shadow-lg",
        className,
      )}
    >
      {/* Simulated film frame — a real <video> element replaces this */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#2a2016_0%,#0c0d0f_55%,#08090a_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_60%,rgba(0,0,0,0.55)_100%)]" />

      {state === "decision" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center rr-animate-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-soft-foreground">
            Decision point
          </span>
          <p className="max-w-xs text-[15px] font-medium text-foreground">
            Ball-handler off the pick. What&apos;s the read?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Attack downhill", "Skip pass weak side", "Pull-up jumper"].map((option) => (
              <button
                key={option}
                type="button"
                className="rounded-md border border-border-strong bg-surface-2/90 px-3 py-2 text-[13px] font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:bg-primary-soft"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {state === "playing" && (
        <button
          type="button"
          onClick={() => setState("decision")}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Pause"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
            <Pause className="size-6" aria-hidden="true" />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setState(state === "playing" ? "decision" : "playing")}
          className="flex size-8 items-center justify-center rounded-full bg-white text-black transition-transform duration-[var(--duration-fast)] hover:scale-105"
          aria-label={state === "playing" ? "Pause" : "Play"}
        >
          {state === "playing" ? (
            <Pause className="size-3.5 fill-current" aria-hidden="true" />
          ) : (
            <Play className="size-3.5 fill-current" aria-hidden="true" />
          )}
        </button>

        <div className="relative h-1 flex-1 rounded-full bg-white/20">
          <div className="h-full w-[42%] rounded-full bg-primary" />
          <span
            className="absolute -top-1 h-3 w-1 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)]"
            style={{ left: "42%" }}
            aria-hidden="true"
          />
        </div>

        <span className="font-mono text-[11.5px] tabular-nums text-white/80">0:14 / 0:32</span>
        <Volume2 className="size-4 text-white/70" aria-hidden="true" />
        <Maximize2 className="size-4 text-white/70" aria-hidden="true" />
      </div>
    </div>
  );
}
