"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VideoSurface,
  type VideoSurfaceHandle,
} from "@/components/video/video-surface";
import { SKILL_CATEGORY_LABELS, type VideoSource } from "@/lib/reps/schema";
import type { PublicRep } from "@/lib/reps/public-rep";

/** How much film runs before the decision, and how long the pause is held. */
const RUN_UP_MS = 4200;
const HOLD_MS = 2600;

function Timeline({ rep, currentMs }: { rep: PublicRep; currentMs: number }) {
  const span = rep.clipEndMs - rep.clipStartMs;
  const pct = (ms: number) =>
    Math.min(100, Math.max(0, ((ms - rep.clipStartMs) / span) * 100));

  return (
    <div className="relative h-1 rounded-full bg-ink-800">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-ink-600"
        style={{ width: `${pct(rep.decisionPauseMs)}%` }}
      />
      <span
        className="absolute -top-1 h-3 w-0.5 bg-lime-accent"
        style={{ left: `${pct(rep.decisionPauseMs)}%` }}
      />
      <span
        className="absolute -top-0.5 h-2 w-2 -translate-x-1/2 rounded-full bg-ink-100 transition-[left] duration-100 ease-linear"
        style={{ left: `${pct(currentMs)}%` }}
      />
    </div>
  );
}

/**
 * A faithful still of the rep screen, running on the real film and the real
 * seeded rep. It loops the last few seconds into the decision and holds there,
 * which is the one thing about the product a static image cannot show.
 *
 * The choices are shown but inert — the interactive decision lives further down
 * the page, and nothing here is graded, so no answer is present in the markup.
 */
export function HeroPreview({
  rep,
  source,
  totalReps,
  jerseyNumber,
}: {
  rep: PublicRep;
  source: VideoSource;
  totalReps: number;
  jerseyNumber: string;
}) {
  const videoRef = useRef<VideoSurfaceHandle>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const [paused, setPaused] = useState(true);
  const [currentMs, setCurrentMs] = useState(rep.decisionPauseMs);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const runUpFrom = rep.decisionPauseMs - RUN_UP_MS;

  const loop = useCallback(() => {
    setPaused(false);
    void videoRef.current?.playFrom(runUpFrom);
  }, [runUpFrom]);

  const onReachedStop = useCallback(() => {
    setPaused(true);
    timerRef.current = setTimeout(loop, HOLD_MS);
  }, [loop]);

  /**
   * Starts on `canplay` rather than `loadedmetadata`: metadata is enough to
   * seek but not to paint, so seeking any earlier leaves a black frame. Fires
   * repeatedly during playback, hence the guard.
   */
  const onReady = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (reducedMotion) {
      videoRef.current?.seek(rep.decisionPauseMs);
      setCurrentMs(rep.decisionPauseMs);
      return;
    }
    loop();
  }, [loop, reducedMotion, rep.decisionPauseMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <figure className="surface-dark accent-court overflow-hidden rounded-[6px] border border-graphite-950/15 shadow-[0_18px_40px_-24px_rgba(22,19,15,0.45)]">
      {/*
        Chrome sits above the film rather than on it, both because that is what
        the real session does and because the film carries its own clock bug in
        the top-left corner.
      */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <p className="label-caps text-ink-100">
            Rep {rep.order} of {totalReps}
          </p>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: totalReps }, (_, index) => (
              <span
                key={index}
                className={`h-1 w-4 rounded-full ${
                  index < rep.order - 1
                    ? "bg-lime-accent"
                    : index === rep.order - 1
                      ? "bg-ink-300"
                      : "bg-ink-700"
                }`}
              />
            ))}
          </div>
        </div>
        <span className="label-caps text-ink-400">
          You&rsquo;re #{jerseyNumber}
        </span>
      </header>

      <div className="relative border-y border-ink-800">
        <VideoSurface
          ref={videoRef}
          source={source}
          stopAtMs={paused ? null : rep.decisionPauseMs}
          onReachedStop={onReachedStop}
          onCanPlay={onReady}
          onTimeUpdate={setCurrentMs}
        />

        <div className="pointer-events-none absolute bottom-3 left-3">
          <span
            className={`label-caps rounded-sm px-2 py-1 transition-[color,background-color] duration-200 ${
              paused
                ? "bg-lime-accent text-ink-950"
                : "bg-ink-950/85 text-ink-400"
            }`}
          >
            {paused ? "Paused — your read" : "Playing"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5">
        <span className="label-caps shrink-0 rounded-sm bg-lime-accent px-2 py-1 text-ink-950">
          {SKILL_CATEGORY_LABELS[rep.category]}
        </span>
        <div className="min-w-0 flex-1">
          <Timeline rep={rep} currentMs={currentMs} />
        </div>
      </div>

      {/* Opacity rather than mounting, so the frame never changes height. */}
      <div
        className={`border-t border-ink-800 px-4 py-3.5 transition-opacity duration-300 ${
          paused ? "opacity-100" : "opacity-40"
        }`}
        aria-hidden="true"
      >
        <p className="text-[0.8125rem] leading-snug font-medium text-ink-50">
          {rep.prompt}
        </p>
        <ul className="mt-2.5 flex flex-col gap-1">
          {rep.choices.map((choice, index) => (
            <li
              key={choice.id}
              className="flex items-center gap-2.5 rounded-[3px] border border-ink-700 px-2.5 py-1 text-xs text-ink-200"
            >
              <span className="font-mono text-[0.625rem] text-ink-500">
                {String.fromCharCode(65 + index)}
              </span>
              {choice.label}
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="border-t border-ink-800 px-4 py-2.5 text-[0.6875rem] text-ink-500">
        Interactive tactical demo — animated re-creation, not uploaded film.
      </figcaption>
    </figure>
  );
}
