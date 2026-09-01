"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  scoutPlayerCandidates,
  startGameAnalysis,
  type GameAnalysisView,
  type PlayerScoutCandidate,
} from "@/lib/actions/game-analysis";
import type { ConfirmedReference } from "@/lib/ai/game-analysis/reference";

const MIN_CONFIRMED = 2;
const MAX_CONFIRMED = 3;
const BOX_W = 0.14;
const BOX_H = 0.3;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Confirmed = ConfirmedReference & { candidateId: string };

/**
 * "Is this your player?" — the whole page. Scans the game for live footage where
 * the team colour is visible, shows each candidate as a short looping clip plus
 * a still, lets the coach click the player (saving a crop + point), and asks
 * Yes / No / Not clear. Analysis unlocks only after 2–3 confirmations with the
 * number readable on at least one. No pipeline internals shown.
 */
export function PlayerConfirm({
  gameId,
  target,
  onStarted,
}: {
  gameId: string;
  target: { jerseyNumber: string; teamColor: string; marker: string | null };
  onStarted: (view: GameAnalysisView) => void;
}) {
  const [phase, setPhase] = useState<"scanning" | "reviewing" | "scan-failed">("scanning");
  const [scanError, setScanError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlayerScoutCandidate[]>([]);
  const [index, setIndex] = useState(0);
  const [confirmed, setConfirmed] = useState<Confirmed[]>([]);
  const [pendingCrop, setPendingCrop] = useState<{ crop: string; point: { x: number; y: number }; box: ConfirmedReference["box"] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  // The async work only — no synchronous setState before the first await, so it
  // is safe to kick straight from an effect. `phase` already starts "scanning".
  const runScan = useCallback(async () => {
    const result = await scoutPlayerCandidates(gameId);
    if (!result.ok) {
      setScanError(result.error);
      setPhase("scan-failed");
      return;
    }
    setCandidates(result.data.candidates);
    setIndex(0);
    setConfirmed([]);
    setPendingCrop(null);
    setPhase("reviewing");
  }, [gameId]);

  const rescan = useCallback(() => {
    setPhase("scanning");
    setScanError(null);
    setConfirmed([]);
    setPendingCrop(null);
    void runScan();
  }, [runScan]);

  useEffect(() => {
    // One-shot fetch from an external system on mount. Every setState inside
    // runScan happens after an await, so there is no synchronous cascade — the
    // lint rule can't see through the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runScan();
  }, [runScan]);

  const current = candidates[index];
  const hasNumber = confirmed.some((c) => c.numberVisible);
  const canAnalyze = confirmed.length >= MIN_CONFIRMED && hasNumber && !starting;
  const outOfCandidates = phase === "reviewing" && index >= candidates.length;

  function onStillClick(event: React.MouseEvent<HTMLImageElement>) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    const box = {
      x: Math.min(1 - BOX_W, Math.max(0, nx - BOX_W / 2)),
      y: Math.min(1 - BOX_H, Math.max(0, ny - BOX_H / 2)),
      w: BOX_W,
      h: BOX_H,
    };

    // Draw the box region straight off the loaded <img>. Mux serves the image
    // with Access-Control-Allow-Origin: *, so the canvas is not tainted.
    const nW = img.naturalWidth || 960;
    const nH = img.naturalHeight || 540;
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(img, box.x * nW, box.y * nH, box.w * nW, box.h * nH, 0, 0, canvas.width, canvas.height);
      const crop = canvas.toDataURL("image/webp", 0.8);
      setPendingCrop({ crop, point: { x: nx, y: ny }, box });
    } catch {
      setPendingCrop(null);
      setStartError("Couldn't read that frame. Try another clip.");
    }
  }

  function nextCandidate() {
    setPendingCrop(null);
    setIndex((i) => i + 1);
  }

  function confirm(numberVisible: boolean) {
    if (!pendingCrop || !current) return;
    const ref: Confirmed = {
      candidateId: current.id,
      timestampSeconds: current.timestampSeconds,
      point: pendingCrop.point,
      box: pendingCrop.box,
      crop: pendingCrop.crop,
      numberVisible,
      jerseyColor: target.teamColor,
      ...(target.marker ? { appearanceCue: target.marker.slice(0, 120) } : {}),
    };
    setConfirmed((list) => [...list.filter((c) => c.candidateId !== current.id), ref].slice(-MAX_CONFIRMED));
    nextCandidate();
  }

  async function analyze() {
    setStarting(true);
    setStartError(null);
    const result = await startGameAnalysis({
      gameId,
      jerseyNumber: target.jerseyNumber,
      teamColor: target.teamColor,
      marker: target.marker ?? undefined,
      confirmedReferences: confirmed.map((c) => ({
        timestampSeconds: c.timestampSeconds,
        point: c.point,
        box: c.box,
        crop: c.crop,
        numberVisible: c.numberVisible,
        jerseyColor: c.jerseyColor,
        ...(c.appearanceCue ? { appearanceCue: c.appearanceCue } : {}),
      })),
    });
    setStarting(false);
    if (!result.ok) {
      setStartError(result.error);
      return;
    }
    onStarted(result.data);
  }

  // --- scanning ------------------------------------------------------
  if (phase === "scanning") {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-fg" />
          <p className="text-sm text-fg">Looking for {target.teamColor.toLowerCase()} #{target.jerseyNumber} in the game…</p>
        </div>
        <p className="max-w-prose text-sm text-fg-faint">This takes a moment. We only keep live basketball — studio, replays, timeouts and dead-ball footage are skipped.</p>
      </div>
    );
  }

  if (phase === "scan-failed") {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="display-3 text-fg">We couldn&rsquo;t line up your player.</p>
        <p className="max-w-prose text-sm text-fg-soft">{scanError}</p>
        <div className="flex gap-3">
          <Button onClick={rescan}>Scan again</Button>
          <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
            Build reps manually
          </ButtonLink>
        </div>
      </div>
    );
  }

  // --- confirmed enough, or out of candidates ----------------------
  if (outOfCandidates || confirmed.length >= MAX_CONFIRMED) {
    return (
      <div className="flex flex-col gap-5">
        <ConfirmedStrip confirmed={confirmed} target={target} />
        {confirmed.length >= MIN_CONFIRMED && hasNumber ? (
          <>
            <p className="text-sm text-fg-soft">
              {confirmed.length} confirmed sighting{confirmed.length === 1 ? "" : "s"}. Ready to analyse just this player.
            </p>
            {startError ? <p role="alert" className="text-sm text-bad">{startError}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => void analyze()} disabled={!canAnalyze}>
                {starting ? "Starting…" : "Analyze game"}
              </Button>
              <Button variant="ghost" onClick={rescan}>
                Start over
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="max-w-prose text-sm text-fg-soft">
              {confirmed.length < MIN_CONFIRMED
                ? `We need ${MIN_CONFIRMED} clear sightings and couldn't get there from these clips.`
                : "None of your confirmations clearly showed the jersey number, so we can't be sure it's the right player."}
            </p>
            <div className="flex gap-3">
              <Button onClick={rescan}>Scan again</Button>
              <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
                Build reps manually
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- reviewing one candidate -----------------------------------
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="label-caps text-fg-faint">
          Confirm your player — {confirmed.length} of {MIN_CONFIRMED} done
        </p>
        <span className="text-sm text-fg-faint">
          Clip {index + 1} of {candidates.length} &middot; {clock(current.timestampSeconds)}
        </span>
      </div>

      <p className="text-sm text-fg-soft">
        Is <span className="font-medium text-fg">{target.teamColor.toLowerCase()} #{target.jerseyNumber}</span> in this
        clip? If so, click on them in the frame below.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.previewUrl}
          alt={`Preview at ${clock(current.timestampSeconds)}`}
          className="w-full rounded-frame border border-line bg-surface"
          loading="lazy"
        />
        <div className="relative overflow-hidden rounded-frame border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={current.stillUrl}
            crossOrigin="anonymous"
            alt={`Frame at ${clock(current.timestampSeconds)} — click your player`}
            onClick={onStillClick}
            className="w-full cursor-crosshair"
          />
          {pendingCrop ? (
            <span
              aria-hidden
              className="pointer-events-none absolute border-2 border-accent"
              style={{
                left: `${pendingCrop.box.x * 100}%`,
                top: `${pendingCrop.box.y * 100}%`,
                width: `${pendingCrop.box.w * 100}%`,
                height: `${pendingCrop.box.h * 100}%`,
              }}
            />
          ) : null}
        </div>
      </div>

      {pendingCrop ? (
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingCrop.crop} alt="Selected player" className="h-28 rounded-panel border border-line" />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg">Is this {target.teamColor.toLowerCase()} #{target.jerseyNumber}?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => confirm(true)}>
                Yes — I can read #{target.jerseyNumber}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => confirm(false)}>
                Yes — number not visible here
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setPendingCrop(null); nextCandidate(); }}>
                No / not clear
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button variant="ghost" onClick={nextCandidate}>
            Not in this clip
          </Button>
        </div>
      )}

      {confirmed.length > 0 ? <ConfirmedStrip confirmed={confirmed} target={target} /> : null}
      {startError ? <p role="alert" className="text-sm text-bad">{startError}</p> : null}
    </div>
  );
}

function ConfirmedStrip({
  confirmed,
  target,
}: {
  confirmed: Confirmed[];
  target: { jerseyNumber: string };
}) {
  if (confirmed.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-raised p-3">
      <span className="label-caps text-fg-faint">Confirmed</span>
      {confirmed.map((c) => (
        <span key={c.candidateId} className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.crop} alt="" className="h-12 rounded-xs border border-line" />
          <span className="timecode text-fg-faint">
            {clock(c.timestampSeconds)}
            {c.numberVisible ? ` · #${target.jerseyNumber}` : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
