"use client";

import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/panel";
import { Field, inputClass } from "@/components/ui/field";
import {
  cancelGameUpload,
  markUploadFinished,
  markUploadStarted,
  startGameUpload,
} from "@/lib/actions/upload";
import { ACCEPTED_VIDEO_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/video/provider";

const TEAM_COLORS = ["White", "Black", "Red", "Blue", "Green", "Gold", "Grey"];
const ACCEPTED = [...ACCEPTED_VIDEO_EXTENSIONS];

type Step = 1 | 2 | 3 | 4;

function formatBytes(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

/**
 * Puts the file on the video host directly from the browser.
 *
 * The bytes go to the provider's signed URL, never through a server function —
 * a full game is gigabytes, and no serverless request body should carry that.
 * XHR rather than fetch, because only XHR reports upload progress.
 */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url, true);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`The video host rejected the upload (${request.status}).`));
    };
    request.onerror = () => reject(new Error("The connection to the video host failed."));
    request.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    signal.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file);
  });
}

export function UploadFlow({
  demoGameId,
  uploadsEnabled,
  uploadsDisabledReason,
  fixtureMode,
  storageLabel,
}: {
  demoGameId: string;
  uploadsEnabled: boolean;
  uploadsDisabledReason: string | null;
  fixtureMode: boolean;
  storageLabel: string;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [jerseyNumber, setJerseyNumber] = useState("");
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);
  const [marker, setMarker] = useState("");

  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [playedOn, setPlayedOn] = useState("");

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    const name = candidate.name.toLowerCase();
    if (!ACCEPTED.some((extension) => name.endsWith(extension))) {
      setFileError(`That file type is not supported. Use ${ACCEPTED.join(", ")}.`);
      return;
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setFileError(`That file is ${formatBytes(candidate.size)}. The limit is 6 GB.`);
      return;
    }
    if (candidate.size === 0) {
      setFileError("That file is empty.");
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  const upload = useCallback(async () => {
    if (!file) return;

    setStep(4);
    setUploading(true);
    setError(null);
    setNeedsLogin(false);
    setProgress(0);

    let started;
    try {
      started = await startGameUpload({
        title: title.trim(),
        opponent: opponent.trim(),
        playedOn,
        identity: {
          jerseyNumber: jerseyNumber.trim(),
          teamColor,
          ...(marker.trim() ? { marker: marker.trim() } : {}),
        },
        fileName: file.name,
      });
    } catch {
      // A Server Action that threw (network drop, or an unexpected server
      // fault). Never leave the bar sitting at 0%: put the player back on the
      // filled-in form with the reason, so they can just press the button again.
      setUploading(false);
      setStep(3);
      setError("Could not reach the server to start the upload. Try again.");
      return;
    }

    if (!started.ok) {
      // Nothing was created — return to the (still-populated) confirm step and
      // show why, rather than stranding a 0% progress bar.
      setUploading(false);
      setStep(3);
      if (started.code === "auth-required") setNeedsLogin(true);
      setError(started.error);
      return;
    }

    setGameId(started.data.gameId);
    const startedData = started.data;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await markUploadStarted(startedData.gameId);
      await putWithProgress(startedData.uploadUrl, file, setProgress, controller.signal);
      await markUploadFinished(startedData.gameId);
      router.push(`/games/${startedData.gameId}/processing`);
    } catch (cause) {
      setUploading(false);
      if (cause instanceof DOMException && cause.name === "AbortError") {
        await cancelGameUpload(startedData.gameId).catch(() => undefined);
        setGameId(null);
        setStep(3);
        setError("Upload cancelled.");
        return;
      }
      setError(cause instanceof Error ? cause.message : "The upload failed.");
    }
  }, [file, jerseyNumber, marker, opponent, playedOn, router, teamColor, title]);

  const step2Valid = jerseyNumber.trim().length > 0;
  const step3Valid = Boolean(title.trim() && opponent.trim() && playedOn);

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex gap-2" aria-label="Upload steps">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 flex-col gap-2">
            <span className={`h-0.5 rounded-full ${n <= step ? "bg-accent" : "bg-sunken"}`} />
            <span className={`label-caps ${n <= step ? "text-fg" : "text-fg-faint"}`}>
              {n === 1 ? "Upload game" : n === 2 ? "Identify player" : "Confirm"}
            </span>
          </li>
        ))}
      </ol>

      {!uploadsEnabled ? (
        <div
          role="alert"
          className="flex flex-col gap-1.5 rounded-panel border border-line bg-surface px-4 py-3.5"
        >
          <p className="label-caps text-fg-faint">Uploads unavailable</p>
          <p className="text-sm leading-relaxed text-fg-soft">{uploadsDisabledReason}</p>
        </div>
      ) : fixtureMode ? (
        <p className="rounded-panel border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-fg-soft">
          <span className="label-caps mr-2 inline-flex rounded-xs bg-raised px-2 py-1 text-fg">
            Fixture mode
          </span>
          Mux is not configured. Your file is streamed and measured so progress is real, then
          discarded — the game will play the committed demo film, not your footage. Reps you author
          are stored in {storageLabel}.
        </p>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-3 rounded-panel border border-dashed px-6 py-12 text-center transition-[border-color,background-color] duration-150 ease-signal ${
              isDragging ? "border-accent bg-raised" : "border-line-strong bg-surface"
            }`}
          >
            <p className="display-3 text-fg">Drop your game file here</p>
            <p className="text-sm text-fg-faint">{ACCEPTED.join(", ")} · up to 6 GB</p>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            <Button
              variant="secondary"
              disabled={!uploadsEnabled}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose a file
            </Button>
          </div>

          {fileError ? (
            <p role="alert" className="text-sm text-bad">
              {fileError}
            </p>
          ) : null}

          {file ? (
            <div className="rounded-panel border border-line bg-surface p-4">
              <p className="text-sm text-fg">
                {file.name} <span className="text-fg-faint">· {formatBytes(file.size)}</span>
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setStep(2)} disabled={!file || !uploadsEnabled}>
              Continue
            </Button>
            <ButtonLink href={`/games/${demoGameId}/processing`} variant="ghost">
              Use demo game instead
            </ButtonLink>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-5">
          <p className="max-w-prose text-sm leading-relaxed text-fg-soft">
            Tell us who to follow. This is what a reviewer uses to find you on the tape.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jersey number">
              <input
                className={inputClass}
                value={jerseyNumber}
                inputMode="numeric"
                maxLength={3}
                placeholder="22"
                onChange={(event) => setJerseyNumber(event.target.value)}
              />
            </Field>
            <Field label="Team color">
              <select
                className={inputClass}
                value={teamColor}
                onChange={(event) => setTeamColor(event.target.value)}
              >
                {TEAM_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Anything else that identifies you" hint="Optional">
            <input
              className={inputClass}
              value={marker}
              maxLength={120}
              placeholder="White leg sleeves"
              onChange={(event) => setMarker(event.target.value)}
            />
          </Field>

          <div className="flex gap-3">
            <Button onClick={() => setStep(3)} disabled={!step2Valid}>
              Continue
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Game title">
              <input
                className={inputClass}
                value={title}
                maxLength={120}
                placeholder="Saturday vs. Dragons"
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Opponent">
              <input
                className={inputClass}
                value={opponent}
                maxLength={80}
                placeholder="Dragons"
                onChange={(event) => setOpponent(event.target.value)}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={playedOn}
                onChange={(event) => setPlayedOn(event.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-panel border border-line bg-surface p-4">
            <SectionLabel>Player identity</SectionLabel>
            <p className="mt-2 text-sm text-fg">
              {teamColor} · #{jerseyNumber || "—"}
              {marker ? ` · ${marker}` : ""}
            </p>
            {file ? <p className="mt-1 text-sm text-fg-faint">{file.name}</p> : null}
          </div>

          {error ? (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="text-sm text-bad">{error}</p>
              {needsLogin ? (
                <ButtonLink
                  href={`/login?redirectTo=${encodeURIComponent("/games/new")}`}
                  variant="secondary"
                >
                  Log in to upload
                </ButtonLink>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button onClick={() => void upload()} disabled={!step3Valid || !uploadsEnabled} size="lg">
              Upload and analyze
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                setNeedsLogin(false);
                setStep(2);
              }}
            >
              Back
            </Button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-col gap-4">
          <SectionLabel>Uploading</SectionLabel>
          <p className="text-sm text-fg-soft">
            {file?.name} · {file ? formatBytes(file.size) : ""}
          </p>

          <div
            className="h-1 w-full overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="timecode text-fg-faint">{Math.round(progress * 100)}%</p>

          {error ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm text-bad">{error}</p>
              <div className="flex gap-3">
                <Button onClick={() => void upload()}>Retry upload</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                >
                  Back
                </Button>
              </div>
            </div>
          ) : uploading ? (
            <div>
              <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
                Cancel upload
              </Button>
            </div>
          ) : null}

          {gameId && !uploading && !error ? (
            <ButtonLink href={`/games/${gameId}/processing`}>Continue</ButtonLink>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
