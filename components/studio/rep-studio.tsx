"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import {
  VideoSurface,
  type VideoSurfaceHandle,
} from "@/components/video/video-surface";
import { TimelineScrubber } from "./timeline-scrubber";
import { RepPreviewModal } from "./rep-preview-modal";
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  type Difficulty,
  type Rep,
  type SkillCategory,
  type VideoSource,
} from "@/lib/reps/schema";
import { formatTimecode, validateRepTiming } from "@/lib/reps/timing";
import { saveRepDraft } from "@/lib/actions/studio";

const CHOICE_IDS = ["a", "b", "c", "d"] as const;
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type TimingKey = "clipStartMs" | "decisionPauseMs" | "clipEndMs";

const TIMING_FIELDS: { key: TimingKey; label: string; hint: string }[] = [
  {
    key: "clipStartMs",
    label: "Clip start",
    hint: "Where the rep begins playing",
  },
  {
    key: "decisionPauseMs",
    label: "Decision",
    hint: "The instant before the read",
  },
  { key: "clipEndMs", label: "Clip end", hint: "After the outcome is visible" },
];

export function RepStudio({
  gameId,
  gameTitle,
  source,
  durationMs,
  existingRep,
  repCount,
  aside,
}: {
  gameId: string;
  gameTitle: string;
  source: VideoSource;
  durationMs: number | null;
  existingRep: Rep | null;
  repCount: number;
  /** Rendered under the stage, so the film column is not a column of void. */
  aside?: ReactNode;
}) {
  const router = useRouter();
  const videoRef = useRef<VideoSurfaceHandle>(null);

  const [currentMs, setCurrentMs] = useState(0);
  const [measuredDurationMs, setMeasuredDurationMs] = useState<number | null>(
    durationMs,
  );
  const [isPaused, setIsPaused] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [title, setTitle] = useState(existingRep?.title ?? "");
  const [category, setCategory] = useState<SkillCategory>(
    existingRep?.category ?? SKILL_CATEGORIES[0],
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    existingRep?.difficulty ?? "medium",
  );
  const [situation, setSituation] = useState(existingRep?.situation ?? "");
  const [prompt, setPrompt] = useState(existingRep?.prompt ?? "");
  const [actualOutcome, setActualOutcome] = useState(
    existingRep?.actualOutcome ?? "",
  );
  const [explanation, setExplanation] = useState(
    existingRep?.explanation ?? "",
  );
  const [coachingCue, setCoachingCue] = useState(
    existingRep?.coachingCue ?? "",
  );

  const [timing, setTiming] = useState<Record<TimingKey, number>>({
    clipStartMs: existingRep?.clipStartMs ?? 0,
    decisionPauseMs: existingRep?.decisionPauseMs ?? 4000,
    clipEndMs: existingRep?.clipEndMs ?? 9000,
  });

  const [choiceLabels, setChoiceLabels] = useState<string[]>(() => {
    if (!existingRep) return ["", "", "", ""];
    const labels = CHOICE_IDS.map(
      (id) =>
        existingRep.choices.find((choice) => choice.id === id)?.label ?? "",
    );
    return labels;
  });
  const [correctChoiceId, setCorrectChoiceId] = useState(
    existingRep?.correctChoiceId ?? "a",
  );
  const [actualChoiceId, setActualChoiceId] = useState(
    existingRep?.actualChoiceId ?? "b",
  );

  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const effectiveDuration = measuredDurationMs ?? durationMs;
  const timingIssues = useMemo(
    () => validateRepTiming(timing, effectiveDuration),
    [timing, effectiveDuration],
  );

  const choices = useMemo(
    () =>
      CHOICE_IDS.map((id, index) => ({
        id,
        label: choiceLabels[index]?.trim() ?? "",
      })).filter((choice) => choice.label.length > 0),
    [choiceLabels],
  );

  const capture = useCallback((key: TimingKey) => {
    const at = Math.round(videoRef.current?.currentTimeMs() ?? 0);
    setTiming((current) => ({ ...current, [key]: at }));
    setNotice(null);
  }, []);

  const nudge = useCallback((key: TimingKey, deltaMs: number) => {
    setTiming((current) => {
      const next = Math.max(0, current[key] + deltaMs);
      videoRef.current?.seek(next);
      setCurrentMs(next);
      return { ...current, [key]: next };
    });
  }, []);

  const seekTo = useCallback((ms: number) => {
    videoRef.current?.seek(ms);
    setCurrentMs(ms);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.isPaused()) void video.resume();
    else video.pause();
  }, []);

  const previewRep: Rep | null = useMemo(() => {
    if (choices.length < 2) return null;
    if (!choices.some((choice) => choice.id === correctChoiceId)) return null;
    if (!choices.some((choice) => choice.id === actualChoiceId)) return null;
    if (timingIssues.length > 0) return null;

    return {
      id: existingRep?.id ?? "preview",
      gameId,
      order: existingRep?.order ?? repCount + 1,
      status: "draft",
      publishedAt: null,
      title: title || "Untitled rep",
      category,
      difficulty,
      clipStartMs: timing.clipStartMs,
      decisionPauseMs: timing.decisionPauseMs,
      clipEndMs: timing.clipEndMs,
      situation: situation || "—",
      prompt: prompt || "What is your best read?",
      choices,
      correctChoiceId,
      actualChoiceId,
      actualOutcome: actualOutcome || "—",
      explanation: explanation || "—",
      coachingCue: coachingCue || "—",
    };
  }, [
    actualChoiceId,
    actualOutcome,
    category,
    choices,
    coachingCue,
    correctChoiceId,
    difficulty,
    existingRep,
    explanation,
    gameId,
    prompt,
    repCount,
    situation,
    timing,
    timingIssues.length,
    title,
  ]);

  async function save(publish: boolean) {
    setSaving(publish ? "publish" : "draft");
    setError(null);
    setNotice(null);

    const result = await saveRepDraft({
      id: existingRep?.id ?? null,
      gameId,
      title,
      category,
      difficulty,
      clipStartMs: timing.clipStartMs,
      decisionPauseMs: timing.decisionPauseMs,
      clipEndMs: timing.clipEndMs,
      situation,
      prompt,
      choices,
      correctChoiceId,
      actualChoiceId,
      actualOutcome,
      explanation,
      coachingCue,
      publish,
    });

    setSaving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (publish) {
      router.push(`/studio/${gameId}?published=${result.data.repId}`);
      router.refresh();
      return;
    }

    setNotice("Draft saved.");
    router.replace(`/studio/${gameId}?rep=${result.data.repId}`);
    router.refresh();
  }

  const canPublish = timingIssues.length === 0 && choices.length >= 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-frame border border-line bg-surface">
          <VideoSurface
            key={playerAttempt}
            ref={videoRef}
            source={source}
            muted={false}
            onTimeUpdate={(ms) => setCurrentMs(ms)}
            onLoadedMetadata={(ms) => setMeasuredDurationMs(ms)}
            onPlayStateChange={setIsPaused}
            onError={setVideoError}
          />
          <div className="flex flex-col gap-3 border-t border-line p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" size="sm" onClick={togglePlay}>
                {isPaused ? "Play" : "Pause"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seekTo(Math.max(0, currentMs - 5000))}
              >
                −5s
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seekTo(Math.max(0, currentMs - 1000))}
              >
                −1s
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seekTo(currentMs + 1000)}
              >
                +1s
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seekTo(currentMs + 5000)}
              >
                +5s
              </Button>
              <span className="timecode ml-auto text-fg-faint">
                {formatTimecode(currentMs)}
              </span>
            </div>
            <TimelineScrubber
              currentMs={currentMs}
              durationMs={effectiveDuration}
              markers={TIMING_FIELDS.map((field) => ({
                key: field.key,
                label: field.label,
                ms: timing[field.key],
              }))}
              onScrub={seekTo}
            />
          </div>
        </div>

        {videoError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-bad">{videoError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setVideoError(null);
                setPlayerAttempt((n) => n + 1);
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Clip window</SectionLabel>
            <span className="timecode text-fg-faint">
              {formatTimecode(
                Math.max(0, timing.clipEndMs - timing.clipStartMs),
              )}{" "}
              long
            </span>
          </div>

          <div className="grid gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-3">
            {TIMING_FIELDS.map((field) => {
              const issue = timingIssues.find(
                (candidate) => candidate.field === field.key,
              );
              const isDecision = field.key === "decisionPauseMs";
              return (
                <div
                  key={field.key}
                  className="flex flex-col gap-2 bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-caps text-fg-faint">
                      {field.label}
                    </span>
                    {isDecision ? <Chip tone="accent">Freeze</Chip> : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => seekTo(timing[field.key])}
                    title="Go to this timestamp"
                    className={`w-fit rounded-xs text-left font-mono text-base tabular-nums text-fg underline-offset-4 hover:underline ${
                      isDecision ? "decision-mark" : ""
                    }`}
                  >
                    {formatTimecode(timing[field.key])}
                  </button>

                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => capture(field.key)}
                    >
                      Set to playhead
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => nudge(field.key, -100)}
                    >
                      −0.1s
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => nudge(field.key, 100)}
                    >
                      +0.1s
                    </Button>
                  </div>

                  {issue ? (
                    <p className="text-xs leading-relaxed text-bad">
                      {issue.message}
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-fg-faint">
                      {field.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {aside}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-4 sm:p-5">
          <SectionLabel>{existingRep ? "Edit rep" : "New rep"}</SectionLabel>

          <Field label="Title">
            <input
              className={inputClass}
              value={title}
              maxLength={80}
              placeholder="The low man digs"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Skill category">
              <select
                className={inputClass}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SkillCategory)
                }
              >
                {SKILL_CATEGORIES.map((slug) => (
                  <option key={slug} value={slug}>
                    {SKILL_CATEGORY_LABELS[slug]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select
                className={inputClass}
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty)
                }
              >
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Situation" hint="Shown before the clip plays">
            <textarea
              className={textareaClass}
              rows={2}
              maxLength={240}
              value={situation}
              placeholder="Second quarter. Ball swings to you on the right wing."
              onChange={(event) => setSituation(event.target.value)}
            />
          </Field>

          <Field label="Prompt" hint="The question at the decision point">
            <textarea
              className={textareaClass}
              rows={3}
              maxLength={240}
              value={prompt}
              placeholder="You're #22 on the wing. What's your best read?"
              onChange={(event) => setPrompt(event.target.value)}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="label-caps mb-1 text-fg-faint">
              Answer choices
            </legend>
            <p className="mb-1 text-xs text-fg-faint">
              Two to four. Leave a row blank to drop it.
            </p>
            {CHOICE_IDS.map((id, index) => (
              <div key={id} className="flex items-center gap-2">
                <span className="timecode w-4 text-fg-faint">
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  className={inputClass}
                  value={choiceLabels[index]}
                  maxLength={120}
                  aria-label={`Answer choice ${String.fromCharCode(65 + index)}`}
                  onChange={(event) =>
                    setChoiceLabels((current) =>
                      current.map((label, position) =>
                        position === index ? event.target.value : label,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Best read">
              <select
                className={inputClass}
                value={correctChoiceId}
                onChange={(event) => setCorrectChoiceId(event.target.value)}
              >
                {choices.map((choice, index) => (
                  <option key={choice.id} value={choice.id}>
                    {String.fromCharCode(
                      65 + CHOICE_IDS.indexOf(choice.id as "a"),
                    )}{" "}
                    · {choice.label.slice(0, 28)}
                    {index === -1 ? "" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What they did">
              <select
                className={inputClass}
                value={actualChoiceId}
                onChange={(event) => setActualChoiceId(event.target.value)}
              >
                {choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {String.fromCharCode(
                      65 + CHOICE_IDS.indexOf(choice.id as "a"),
                    )}{" "}
                    · {choice.label.slice(0, 28)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="What happened">
            <input
              className={inputClass}
              value={actualOutcome}
              maxLength={160}
              placeholder="Forced the post entry — deflected out of bounds."
              onChange={(event) => setActualOutcome(event.target.value)}
            />
          </Field>

          <Field label="Coaching explanation">
            <textarea
              className={textareaClass}
              rows={4}
              maxLength={600}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
            />
          </Field>

          <Field
            label="Coaching cue"
            hint="One line the player carries into the next game"
          >
            <input
              className={inputClass}
              value={coachingCue}
              maxLength={120}
              placeholder="Low man digs, the corner is open."
              onChange={(event) => setCoachingCue(event.target.value)}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-sm text-good">{notice}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void save(false)}
              disabled={saving !== null}
            >
              {saving === "draft" ? "Saving…" : "Save draft"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPreviewOpen(true)}
              disabled={previewRep === null}
            >
              Preview
            </Button>
            <Button
              onClick={() => void save(true)}
              disabled={saving !== null || !canPublish}
            >
              {saving === "publish" ? "Publishing…" : "Publish rep"}
            </Button>
          </div>

          {!canPublish ? (
            <p className="text-xs text-fg-faint">
              Publishing needs valid timestamps and at least two answer choices.
            </p>
          ) : null}
        </div>
      </div>

      {previewOpen && previewRep ? (
        <RepPreviewModal
          rep={previewRep}
          gameTitle={gameTitle}
          source={source}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
