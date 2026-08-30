"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { FreezeMarks } from "@/components/video/freeze-marks";
import { VideoSurface, type VideoSurfaceHandle } from "@/components/video/video-surface";
import { SKILL_CATEGORY_LABELS, type VideoSource } from "@/lib/reps/schema";
import type { PublicRep } from "@/lib/reps/public-rep";

/** How much film runs before the decision, and how long the pause is held. */
const RUN_UP_MS = 4200;
const HOLD_MS = 2600;

function Timeline({ rep, currentMs }: { rep: PublicRep; currentMs: number }) {
  const span = rep.clipEndMs - rep.clipStartMs;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - rep.clipStartMs) / span) * 100));

  return (
    <div className="relative h-1 rounded-full bg-sunken">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-line-strong"
        style={{ width: `${pct(rep.decisionPauseMs)}%` }}
      />
      <span
        className="absolute -top-1.5 h-4 w-[3px] bg-accent"
        style={{ left: `${pct(rep.decisionPauseMs)}%` }}
      />
      <span
        className="absolute -top-0.5 h-2 w-2 -translate-x-1/2 rounded-full bg-fg transition-[left] duration-100 ease-linear"
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
    <figure className="shell-film overflow-hidden rounded-frame border border-line bg-surface shadow-[0_28px_64px_-36px_rgba(13,14,18,0.55)]">
      {/*
        Chrome sits above the film rather than on it, both because that is what
        the real session does and because the film carries its own clock bug in
        the top-left corner.
      */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <p className="label-caps text-fg">
            Rep {rep.order} of {totalReps}
          </p>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: totalReps }, (_, index) => (
              <span
                key={index}
                className={`h-1 w-4 rounded-full ${
                  index < rep.order - 1
                    ? "bg-accent"
                    : index === rep.order - 1
                      ? "bg-fg-faint"
                      : "bg-line-strong"
                }`}
              />
            ))}
          </div>
        </div>
        <span className="label-caps text-fg-faint">You&rsquo;re #{jerseyNumber}</span>
      </header>

      <div className="relative border-y border-line">
        <VideoSurface
          ref={videoRef}
          source={source}
          stopAtMs={paused ? null : rep.decisionPauseMs}
          onReachedStop={onReachedStop}
          onCanPlay={onReady}
          onTimeUpdate={setCurrentMs}
        />

        <FreezeMarks active={paused} />

        <div className="pointer-events-none absolute bottom-5 left-5">
          {paused ? (
            <Chip tone="accent">Paused &mdash; your read</Chip>
          ) : (
            <span className="label-caps inline-flex items-center rounded-xs bg-canvas/85 px-2 py-1 text-fg-faint">
              Playing
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5">
        <Chip tone="accent">{SKILL_CATEGORY_LABELS[rep.category]}</Chip>
        <div className="min-w-0 flex-1">
          <Timeline rep={rep} currentMs={currentMs} />
        </div>
      </div>

      {/* Opacity rather than mounting, so the frame never changes height. */}
      <div
        className={`border-t border-line px-4 py-3 transition-opacity duration-300 ease-signal ${
          paused ? "opacity-100" : "opacity-40"
        }`}
        aria-hidden="true"
      >
        <p className="text-[0.8125rem] leading-snug font-semibold text-fg">{rep.prompt}</p>
        <ul className="mt-2.5 flex flex-col gap-1">
          {rep.choices.map((choice, index) => (
            <li
              key={choice.id}
              className="flex items-center gap-2.5 rounded-control border border-line px-2.5 py-1 text-xs text-fg-soft"
            >
              <span className="font-mono text-[0.625rem] tabular-nums text-fg-faint">
                {String.fromCharCode(65 + index)}
              </span>
              {choice.label}
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="border-t border-line px-4 py-2 text-[0.6875rem] text-fg-faint">
        Interactive tactical demo — animated re-creation, not uploaded film.
      </figcaption>
    </figure>
  );
}
