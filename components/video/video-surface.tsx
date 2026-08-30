"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { VideoSource } from "@/lib/reps/schema";

export type VideoSurfaceHandle = {
  /** Seeks to `ms` and starts playback. */
  playFrom: (ms: number) => Promise<void>;
  resume: () => Promise<void>;
  pause: () => void;
  /** Seek without changing play state. */
  seek: (ms: number) => void;
  /** Exact position in ms, straight off the media element. */
  currentTimeMs: () => number;
  durationMs: () => number | null;
  isPaused: () => boolean;
};

export type VideoSurfaceProps = {
  source: VideoSource;
  /**
   * Playback stops the instant `currentTime` reaches this, in ms. Polled on
   * animation frames because `timeupdate` fires only every 150-250ms, which
   * overshoots a decision point badly.
   */
  stopAtMs?: number | null;
  onReachedStop?: () => void;
  onLoadedMetadata?: (durationMs: number) => void;
  /** Fires when the element has enough data to paint the current frame. */
  onCanPlay?: () => void;
  onTimeUpdate?: (currentMs: number) => void;
  onPlayStateChange?: (paused: boolean) => void;
  onError?: (message: string) => void;
  captionsOn?: boolean;
  className?: string;
};

/**
 * The one place that talks to a media element.
 *
 * Progressive sources go straight into <source> children. HLS (how Mux serves
 * playback) is native on Safari and iOS and needs hls.js everywhere else, so
 * the library is imported lazily and only when an HLS source is actually used.
 */
export const VideoSurface = forwardRef<VideoSurfaceHandle, VideoSurfaceProps>(function VideoSurface(
  {
    source,
    stopAtMs = null,
    onReachedStop,
    onLoadedMetadata,
    onCanPlay,
    onTimeUpdate,
    onPlayStateChange,
    onError,
    captionsOn = false,
    className = "",
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<number | null>(stopAtMs);
  const firedRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  // Callbacks live in refs so the rAF loop is installed once and never
  // reinstalled by a parent re-render.
  const onReachedStopRef = useRef(onReachedStop);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onCanPlayRef = useRef(onCanPlay);
  const onLoadedMetadataRef = useRef(onLoadedMetadata);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    onReachedStopRef.current = onReachedStop;
    onTimeUpdateRef.current = onTimeUpdate;
    onCanPlayRef.current = onCanPlay;
    onLoadedMetadataRef.current = onLoadedMetadata;
  });

  /*
   * A cached file can reach HAVE_CURRENT_DATA before React attaches its media
   * listeners, in which case `loadedmetadata` and `canplay` are missed
   * entirely and the host never learns the video is usable. Catch up on mount.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration)) {
      onLoadedMetadataRef.current?.(video.duration * 1000);
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      onCanPlayRef.current?.();
    }
  }, []);

  useEffect(() => {
    stopRef.current = stopAtMs;
    firedRef.current = false;
  }, [stopAtMs]);

  const isHls = source.kind === "hls";
  const hlsSrc = source.kind === "hls" ? source.src : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsSrc) return;

    // Safari and iOS play HLS natively; everything else needs Media Source.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
      return;
    }

    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (destroyed) return;
      if (!Hls.isSupported()) {
        onError?.("This browser cannot play the video format.");
        return;
      }
      const hls = new Hls({ enableWorker: true });
      instance = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onError?.("The video stream failed to load.");
      });
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
    })();

    return () => {
      destroyed = true;
      instance?.destroy();
    };
    // onError is intentionally excluded: re-attaching HLS on a parent
    // re-render would restart the stream mid-rep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      const stop = stopRef.current;
      const currentMs = video.currentTime * 1000;
      onTimeUpdateRef.current?.(currentMs);

      if (stop !== null && !firedRef.current && currentMs >= stop) {
        firedRef.current = true;
        video.pause();
        onReachedStopRef.current?.();
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

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    firedRef.current = false;
    try {
      await video.play();
    } catch {
      // Autoplay can be refused before a user gesture; the caller keeps a
      // visible play control, so this is not an error state.
    }
  }, []);

  useImperativeHandle(ref, () => ({
    async playFrom(ms: number) {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = ms / 1000;
      await play();
    },
    resume: play,
    pause() {
      videoRef.current?.pause();
    },
    seek(ms: number) {
      const video = videoRef.current;
      if (!video) return;
      firedRef.current = false;
      video.currentTime = Math.max(0, ms / 1000);
    },
    currentTimeMs() {
      return (videoRef.current?.currentTime ?? 0) * 1000;
    },
    durationMs() {
      const duration = videoRef.current?.duration;
      return duration && Number.isFinite(duration) ? duration * 1000 : null;
    },
    isPaused() {
      return videoRef.current?.paused ?? true;
    },
  }));

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-ink-950 ${className}`}>
      <video
        ref={videoRef}
        poster={source.posterSrc}
        playsInline
        muted
        preload="auto"
        className="h-full w-full object-contain"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          onPlayStateChange?.(false);
        }}
        onPause={() => onPlayStateChange?.(true)}
        onCanPlay={() => {
          setIsBuffering(false);
          onCanPlay?.();
        }}
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration)) onLoadedMetadata?.(duration * 1000);
        }}
        onError={() => onError?.("The film could not be loaded.")}
      >
        {!isHls && source.kind === "progressive"
          ? source.encodings.map((encoding) => (
              <source key={encoding.src} src={encoding.src} type={encoding.type} />
            ))
          : null}
        {source.captionsSrc ? (
          <track kind="captions" src={source.captionsSrc} srcLang="en" label="English" default />
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
