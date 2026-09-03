"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SectionLabel } from "@/components/ui/panel";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { VideoSurface, type VideoSurfaceHandle } from "@/components/video/video-surface";
import type { VideoSource } from "@/lib/reps/schema";
import { DECISION_ACTIONS } from "@/lib/ai/game-analysis/schema";
import {
  deleteCalibrationLabel,
  deleteCalibrationReference,
  saveCalibrationLabel,
  saveCalibrationReference,
  updateCalibrationLabel,
} from "@/lib/actions/calibration";
import type { CalibrationLabel, CalibrationReference } from "@/lib/db/calibration";

type DecisionAction = (typeof DECISION_ACTIONS)[number];
type CalibrationLabelInput = {
  gameId: string;
  kind: "decision" | "non-decision";
  clipStartSeconds: number;
  decisionSeconds: number | null;
  clipEndSeconds: number;
  targetPoint: { x: number; y: number } | null;
  targetCrop: string | null;
  actualAction: DecisionAction | null;
  note: string | null;
  rejectionReason: string | null;
};

const MUX_IMG = "https://image.mux.com";
const BOX_W = 0.14;
const BOX_H = 0.3;
const FRAME_STEP = 1 / 30;

function tc(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${sec}`;
}

type RefDraft = { crop: string; point: { x: number; y: number }; box: CalibrationReference["box"] } | null;

export function CalibrationWorkbench({
  gameId,
  source,
  target,
  initialReferences,
  initialLabels,
}: {
  gameId: string;
  source: VideoSource;
  target: { jerseyNumber: string; teamColor: string };
  initialReferences: CalibrationReference[];
  initialLabels: CalibrationLabel[];
}) {
  const videoRef = useRef<VideoSurfaceHandle>(null);
  const stillRef = useRef<HTMLImageElement>(null);

  const [references, setReferences] = useState(initialReferences);
  const [labels, setLabels] = useState(initialLabels);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [playbackId] = useState(() => (source.kind === "hls" ? extractPlaybackId(source.src) : null));
  const [error, setError] = useState<string | null>(null);

  const nowSec = currentMs / 1000;
  const refsReady = references.length >= 2 && references.some((r) => r.numberVisible);

  // ------- transport --------
  const seekTo = useCallback((sec: number) => {
    const s = Math.max(0, sec);
    videoRef.current?.seek(s * 1000);
    setCurrentMs(s * 1000);
  }, []);
  const nudge = (delta: number) => seekTo(nowSec + delta);
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.isPaused()) void v.resume();
    else v.pause();
  };

  // ------- crop from the current still --------
  function cropAt(event: React.MouseEvent<HTMLImageElement>): RefDraft {
    const img = stillRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const box = {
      x: Math.min(1 - BOX_W, Math.max(0, nx - BOX_W / 2)),
      y: Math.min(1 - BOX_H, Math.max(0, ny - BOX_H / 2)),
      w: BOX_W,
      h: BOX_H,
    };
    const nW = img.naturalWidth || 960;
    const nH = img.naturalHeight || 540;
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(img, box.x * nW, box.y * nH, box.w * nW, box.h * nH, 0, 0, canvas.width, canvas.height);
      return { crop: canvas.toDataURL("image/webp", 0.8), point: { x: nx, y: ny }, box };
    } catch {
      setError("Couldn't read that frame for cropping — seek a touch and retry.");
      return null;
    }
  }

  const stillUrl = playbackId
    ? `${MUX_IMG}/${playbackId}/thumbnail.webp?time=${Math.max(0, nowSec).toFixed(2)}&width=960&fit_mode=preserve`
    : null;

  // ------- reference capture --------
  const [refDraft, setRefDraft] = useState<RefDraft>(null);
  async function saveRef(numberVisible: boolean) {
    if (!refDraft) return;
    const result = await saveCalibrationReference({
      gameId,
      timestampSeconds: Math.round(nowSec * 100) / 100,
      point: refDraft.point,
      box: refDraft.box,
      crop: refDraft.crop,
      numberVisible,
      jerseyColor: target.teamColor,
    });
    if (!result.ok) return setError(result.error);
    setReferences((l) => [...l, result.data.reference]);
    setRefDraft(null);
  }
  async function removeRef(id: string) {
    const result = await deleteCalibrationReference(gameId, id);
    if (result.ok) setReferences((l) => l.filter((r) => r.id !== id));
  }

  // ------- label form --------
  const [form, setForm] = useState<null | { kind: "decision" | "non-decision" }>(null);
  const [clipStart, setClipStart] = useState(0);
  const [decision, setDecision] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [labelCrop, setLabelCrop] = useState<RefDraft>(null);
  const [action, setAction] = useState<DecisionAction>(DECISION_ACTIONS[0]);
  const [note, setNote] = useState("");
  const [rejReason, setRejReason] = useState("");

  function openForm(kind: "decision" | "non-decision") {
    setForm({ kind });
    setClipStart(Math.max(0, nowSec - 5));
    setDecision(nowSec);
    setClipEnd(nowSec + 5);
    setLabelCrop(null);
    setAction(DECISION_ACTIONS[0]);
    setNote("");
    setRejReason("");
    setError(null);
    videoRef.current?.pause();
  }

  async function saveLabel() {
    if (!form) return;
    const payload: CalibrationLabelInput = {
      gameId,
      kind: form.kind,
      clipStartSeconds: round2(clipStart),
      decisionSeconds: form.kind === "decision" ? round2(decision) : null,
      clipEndSeconds: round2(clipEnd),
      targetPoint: labelCrop?.point ?? null,
      targetCrop: labelCrop?.crop ?? null,
      actualAction: form.kind === "decision" ? action : null,
      note: form.kind === "decision" ? note.trim() || null : null,
      rejectionReason: form.kind === "non-decision" ? rejReason.trim() || null : null,
    };
    const result = await saveCalibrationLabel(payload);
    if (!result.ok) return setError(result.error);
    setLabels((l) => [...l, result.data.label].sort((a, b) => a.clipStartSeconds - b.clipStartSeconds));
    setForm(null);
  }

  async function removeLabel(id: string) {
    const result = await deleteCalibrationLabel(gameId, id);
    if (result.ok) setLabels((l) => l.filter((x) => x.id !== id));
  }

  const decisions = labels.filter((l) => l.kind === "decision");
  const nonDecisions = labels.filter((l) => l.kind === "non-decision");
  const goldComplete = decisions.length >= 5 && nonDecisions.length >= 5;

  return (
    <div className="flex flex-col gap-6">
      {/* ---- player + transport ---- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-frame border border-line bg-surface">
          <VideoSurface
            ref={videoRef}
            source={source}
            muted={false}
            onTimeUpdate={(ms) => setCurrentMs(ms)}
            onLoadedMetadata={(ms) => setDurationMs(ms)}
          />
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={togglePlay}>
                Play / Pause
              </Button>
              <Button size="sm" variant="secondary" onClick={() => nudge(-5)}>
                −5s
              </Button>
              <Button size="sm" variant="secondary" onClick={() => nudge(5)}>
                +5s
              </Button>
              <Button size="sm" variant="ghost" onClick={() => nudge(-FRAME_STEP)}>
                ◀ frame
              </Button>
              <Button size="sm" variant="ghost" onClick={() => nudge(FRAME_STEP)}>
                frame ▶
              </Button>
              <span className="timecode ml-auto text-fg">{tc(nowSec)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationMs ? durationMs / 1000 : 2400}
              step={0.1}
              value={nowSec}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full"
              aria-label="Scrub"
            />
          </div>
        </div>

        {/* ---- click surface (still at current time) ---- */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Frame at {tc(nowSec)} — click the player to crop</SectionLabel>
          <div className="relative overflow-hidden rounded-frame border border-line bg-surface">
            {stillUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={stillRef}
                key={stillUrl}
                src={stillUrl}
                crossOrigin="anonymous"
                alt={`Frame at ${tc(nowSec)}`}
                className="w-full cursor-crosshair"
                onClick={(e) => {
                  const d = cropAt(e);
                  if (!d) return;
                  if (form) setLabelCrop(d);
                  else setRefDraft(d);
                }}
              />
            ) : (
              <p className="p-4 text-sm text-fg-faint">No frame source for this video.</p>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}

      {/* ---- references ---- */}
      <section className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4">
        <SectionLabel>
          Player references — {references.length} saved{refsReady ? " · ready" : ` · need 2 (one with the number)`}
        </SectionLabel>
        <p className="max-w-prose text-[0.8125rem] text-fg-soft">
          Seek to a frame where you clearly see {target.teamColor.toLowerCase()} #{target.jerseyNumber}, click them above,
          then save. These genuine crops replace the scout stand-ins for calibration.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {references.map((r) => (
            <span key={r.id} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.crop} alt="" className="h-20 rounded-xs border border-line" />
              <span className="timecode text-fg-faint">
                {tc(r.timestampSeconds)}
                {r.numberVisible ? " · #" : ""}
              </span>
              <button
                type="button"
                onClick={() => removeRef(r.id)}
                className="rounded-xs text-[0.75rem] text-fg-faint underline"
              >
                remove
              </button>
            </span>
          ))}
          {refDraft ? (
            <span className="flex items-center gap-2 rounded-panel border border-accent bg-raised p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={refDraft.crop} alt="Selected" className="h-20 rounded-xs" />
              <span className="flex flex-col gap-1">
                <span className="text-[0.8125rem] text-fg">Number readable in this crop?</span>
                <span className="flex gap-1.5">
                  <Button size="sm" onClick={() => void saveRef(true)}>
                    Yes
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void saveRef(false)}>
                    No
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRefDraft(null)}>
                    Discard
                  </Button>
                </span>
              </span>
            </span>
          ) : null}
        </div>
      </section>

      {/* ---- labeling ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>
            Gold set — {decisions.length}/5 real decisions · {nonDecisions.length}/5 non-decisions
            {goldComplete ? " · complete" : ""}
          </SectionLabel>
          <div className="ml-auto flex gap-2">
            <Button size="sm" disabled={!refsReady || Boolean(form)} onClick={() => openForm("decision")}>
              Mark real decision
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!refsReady || Boolean(form)}
              onClick={() => openForm("non-decision")}
            >
              Mark non-decision
            </Button>
          </div>
        </div>
        {!refsReady ? (
          <p className="text-sm text-fg-faint">Save 2–3 references (one with the jersey number) to start labelling.</p>
        ) : null}

        {form ? (
          <div className="flex flex-col gap-3 rounded-panel border border-accent/50 bg-surface p-4">
            <p className="decision-mark text-sm font-medium text-fg">
              {form.kind === "decision" ? "New real decision" : "New non-decision"}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TimeField label="Clip start" value={clipStart} onSet={() => setClipStart(nowSec)} onChange={setClipStart} />
              {form.kind === "decision" ? (
                <TimeField label="Decision point" value={decision} onSet={() => setDecision(nowSec)} onChange={setDecision} />
              ) : (
                <div />
              )}
              <TimeField label="Clip end" value={clipEnd} onSet={() => setClipEnd(nowSec)} onChange={setClipEnd} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {labelCrop ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={labelCrop.crop} alt="Target" className="h-20 rounded-xs border border-accent" />
              ) : (
                <p className="text-[0.8125rem] text-fg-faint">
                  Seek to the {form.kind === "decision" ? "decision" : "representative"} frame and click the target above.
                </p>
              )}
            </div>

            {form.kind === "decision" ? (
              <>
                <Field label="Actual action committed">
                  <select className={inputClass} value={action} onChange={(e) => setAction(e.target.value as DecisionAction)}>
                    {DECISION_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Why is this a real read? (short)">
                  <textarea className={textareaClass} rows={2} value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </>
            ) : (
              <Field label="Why is this NOT a decision?">
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={rejReason}
                  maxLength={300}
                  onChange={(e) => setRejReason(e.target.value)}
                />
              </Field>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveLabel()}>
                Save label
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {labels.map((l) => (
            <LabelRow
              key={l.id}
              label={l}
              onSeek={() => seekTo(l.clipStartSeconds)}
              onDelete={() => void removeLabel(l.id)}
              onSaved={(updated) =>
                setLabels((list) => list.map((x) => (x.id === updated.id ? updated : x)).sort((a, b) => a.clipStartSeconds - b.clipStartSeconds))
              }
              gameId={gameId}
            />
          ))}
        </ul>

        {goldComplete ? (
          <p className="rounded-panel border border-line bg-raised p-3 text-sm text-fg-soft">
            Gold set complete (5 + 5). The evaluation runs against these ten clips with the genuine references —
            <span className="font-medium text-fg"> ask for the calibration eval report</span>.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function TimeField({
  label,
  value,
  onSet,
  onChange,
}: {
  label: string;
  value: number;
  onSet: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-caps text-fg-faint">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={0.1}
          className={inputClass}
          value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <Button size="sm" variant="secondary" onClick={onSet}>
          set
        </Button>
      </div>
      <span className="timecode text-fg-faint">{tc(value)}</span>
    </div>
  );
}

function LabelRow({
  label,
  gameId,
  onSeek,
  onDelete,
  onSaved,
}: {
  label: CalibrationLabel;
  gameId: string;
  onSeek: () => void;
  onDelete: () => void;
  onSaved: (l: CalibrationLabel) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(label.note ?? "");
  const [rej, setRej] = useState(label.rejectionReason ?? "");
  const [action, setAction] = useState<DecisionAction>((label.actualAction as DecisionAction) ?? DECISION_ACTIONS[0]);

  async function save() {
    const result = await updateCalibrationLabel({
      gameId,
      id: label.id,
      note: label.kind === "decision" ? note.trim() || null : undefined,
      rejectionReason: label.kind === "non-decision" ? rej.trim() || null : undefined,
      actualAction: label.kind === "decision" ? action : undefined,
    });
    if (result.ok) {
      onSaved({
        ...label,
        note: label.kind === "decision" ? note.trim() || null : label.note,
        rejectionReason: label.kind === "non-decision" ? rej.trim() || null : label.rejectionReason,
        actualAction: label.kind === "decision" ? action : label.actualAction,
      });
      setEditing(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <Chip tone={label.kind === "decision" ? "accent" : "quiet"}>{label.kind}</Chip>
        <span className="timecode text-fg-faint">
          {tc(label.clipStartSeconds)}
          {label.decisionSeconds != null ? ` → ${tc(label.decisionSeconds)}` : ""} → {tc(label.clipEndSeconds)}
        </span>
        {label.actualAction ? <span className="text-fg-soft">· {label.actualAction}</span> : null}
        {label.targetCrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={label.targetCrop} alt="" className="h-8 rounded-xs border border-line" />
        ) : null}
        <span className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={onSeek}>
            seek
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            delete
          </Button>
        </span>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          {label.kind === "decision" ? (
            <>
              <select className={inputClass} value={action} onChange={(e) => setAction(e.target.value as DecisionAction)}>
                {DECISION_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <textarea className={textareaClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </>
          ) : (
            <textarea className={textareaClass} rows={2} value={rej} onChange={(e) => setRej(e.target.value)} />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : label.note || label.rejectionReason ? (
        <p className="text-[0.8125rem] text-fg-soft">{label.note ?? label.rejectionReason}</p>
      ) : null}
    </li>
  );
}

function extractPlaybackId(hlsSrc: string): string | null {
  const m = hlsSrc.match(/stream\.mux\.com\/([^.]+)\.m3u8/);
  return m ? m[1] : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
