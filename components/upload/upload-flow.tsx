"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/panel";
import { createUploadedGame } from "@/lib/actions/game";

const ACCEPTED = [".mp4", ".mov", ".m4v", ".webm"];
const MAX_BYTES = 6 * 1024 * 1024 * 1024;

const TEAM_COLORS = ["White", "Black", "Red", "Blue", "Green", "Gold", "Grey"];

type Step = 1 | 2 | 3;

function formatBytes(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-caps text-ink-400">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-600">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "h-10 rounded-panel border border-ink-600 bg-ink-950 px-3 text-sm text-ink-50 placeholder:text-ink-600 focus:border-ink-400";

export function UploadFlow({ demoGameId }: { demoGameId: string }) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    const name = candidate.name.toLowerCase();
    if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
      setFileError(`That file type is not supported. Use ${ACCEPTED.join(", ")}.`);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setFileError(`That file is ${formatBytes(candidate.size)}. The limit is 6 GB.`);
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

  async function submit() {
    setSubmitting(true);
    setError(null);

    const result = await createUploadedGame({
      title: title.trim(),
      opponent: opponent.trim(),
      playedOn,
      identity: {
        jerseyNumber: jerseyNumber.trim(),
        teamColor,
        marker: marker.trim() || undefined,
      },
      fileName: file?.name,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    router.push(`/games/${result.data.gameId}/processing`);
  }

  const step2Valid = jerseyNumber.trim().length > 0;
  const step3Valid = title.trim() && opponent.trim() && playedOn;

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex gap-2" aria-label="Upload steps">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 flex-col gap-2">
            <span className={`h-0.5 rounded-full ${n <= step ? "bg-lime-accent" : "bg-ink-800"}`} />
            <span className={`label-caps ${n <= step ? "text-ink-200" : "text-ink-600"}`}>
              {n === 1 ? "Upload game" : n === 2 ? "Identify player" : "Confirm"}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-3 rounded-panel border border-dashed px-6 py-14 text-center transition-colors ${
              isDragging ? "border-lime-accent bg-ink-900" : "border-ink-700"
            }`}
          >
            <p className="text-sm font-medium text-ink-100">Drop your game file here</p>
            <p className="text-sm text-ink-500">{ACCEPTED.join(", ")} · up to 6 GB</p>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose a file
            </Button>
          </div>

          {fileError ? (
            <p role="alert" className="text-sm text-signal-bad">
              {fileError}
            </p>
          ) : null}

          {file ? (
            <div className="flex flex-col gap-2 rounded-panel border border-ink-700 bg-ink-900 p-4">
              <p className="text-sm text-ink-100">
                {file.name} <span className="text-ink-500">· {formatBytes(file.size)}</span>
              </p>
              <p className="text-sm leading-relaxed text-ink-500">
                Video hosting is not configured in this environment, so the file stays on your
                device. NextRep records the game and your player identity, and the game is queued
                for review.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setStep(2)} disabled={!file}>
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
          <p className="max-w-prose text-sm leading-relaxed text-ink-400">
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

          <div className="rounded-panel border border-ink-700 bg-ink-900 p-4">
            <SectionLabel>Player identity</SectionLabel>
            <p className="mt-2 text-sm text-ink-100">
              {teamColor} · #{jerseyNumber || "—"}
              {marker ? ` · ${marker}` : ""}
            </p>
            {file ? <p className="mt-1 text-sm text-ink-500">{file.name}</p> : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-signal-bad">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button onClick={() => void submit()} disabled={!step3Valid || submitting} size="lg">
              {submitting ? "Saving…" : "Analyze game"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
