"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { VideoSource } from "@/lib/reps/schema";

export type RepVideoHandle = {
  /** Seeks to `ms` and starts playback. Resolves once playback has begun. */
  playFrom: (ms: number) => Promise<void>;
  resume: () => Promise<void>;
  pause: () => void;
  seek: (ms: number) => void;
};

type Props = {
  source: VideoSource;
  /** Playback is stopped the moment `currentTime` reaches this, in ms. */
  stopAtMs: number | null;
  onReachedStop: () => void;
  onError: () => void;
  captionsOn: boolean;
};

/**
 * Wraps the <video> element and owns the one piece of behaviour the rep loop
 * depends on: stopping precisely at a timestamp. `timeupdate` only fires every
 * 150-250ms, which overshoots a decision point badly, so playback is polled on
 * animation frames while running.
 */
export const RepVideo = forwardRef<RepVideoHandle, Props>(function RepVideo(
  { source, stopAtMs, onReachedStop, onError, captionsOn },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);
  const stopRef = useRef<number | null>(stopAtMs);
  const firedRef = useRef(false);
  const onReachedStopRef = useRef(onReachedStop);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    onReachedStopRef.current = onReachedStop;
  }, [onReachedStop]);

  useEffect(() => {
    stopRef.current = stopAtMs;
    firedRef.current = false;
  }, [stopAtMs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      const stop = stopRef.current;
      if (stop !== null && !firedRef.current && video.currentTime * 1000 >= stop) {
        firedRef.current = true;
        video.pause();
        onReachedStopRef.current();
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = captionsOn ? "showing" : "hidden";
    }
  }, [captionsOn]);

  useImperativeHandle(ref, () => ({
    async playFrom(ms: number) {
      const video = videoRef.current;
      if (!video) return;
      firedRef.current = false;
      video.currentTime = ms / 1000;
      try {
        await video.play();
      } catch {
        // Autoplay can be refused; the play control stays available.
      }
    },
    async resume() {
      const video = videoRef.current;
      if (!video) return;
      firedRef.current = false;
      try {
        await video.play();
      } catch {
        // See above.
      }
    },
    pause() {
      videoRef.current?.pause();
    },
    seek(ms: number) {
      const video = videoRef.current;
      if (!video) return;
      firedRef.current = false;
      video.currentTime = ms / 1000;
    },
  }));

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-ink-950">
      <video
        ref={videoRef}
        poster={source.posterSrc}
        playsInline
        muted
        preload="auto"
        className="h-full w-full object-contain"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onError={onError}
      >
        {source.encodings.map((encoding) => (
          <source key={encoding.src} src={encoding.src} type={encoding.type} />
        ))}
        {source.captionsSrc ? (
          <track
            kind="captions"
            src={source.captionsSrc}
            srcLang="en"
            label="English"
            default
          />
        ) : null}
      </video>

      {isBuffering ? (
        <p className="label-caps absolute bottom-3 left-3 rounded-sm bg-ink-950/85 px-2 py-1 text-ink-300">
          Buffering
        </p>
      ) : null}
    </div>
  );
});
