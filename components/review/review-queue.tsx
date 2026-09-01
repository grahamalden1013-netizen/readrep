"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/panel";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { VideoSurface, type VideoSurfaceHandle } from "@/components/video/video-surface";
import type { VideoSource } from "@/lib/reps/schema";
import {
  approveCandidate,
  buildSessionFromApproved,
  editCandidate,
  rejectCandidate,
  type CandidateReviewView,
} from "@/lib/actions/candidates";

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ReviewQueue({
  jobId,
  gameId,
  source,
  initialCandidates,
  initialApproved,
}: {
  jobId: string;
  gameId: string;
  source: VideoSource;
  initialCandidates: CandidateReviewView[];
  initialApproved: number;
}) {
  const router = useRouter();
  const videoRef = useRef<VideoSurfaceHandle>(null);

  const [candidates, setCandidates] = useState(initialCandidates);
  const [index, setIndex] = useState(() => {
    const firstPending = initialCandidates.findIndex((c) => c.status === "pending_review" || c.status === "needs_attention");
    return firstPending === -1 ? 0 : firstPending;
  });
  const [approved, setApproved] = useState(initialApproved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);

  const current = candidates[index];
  const reviewedCount = candidates.filter((c) => c.status !== "pending_review" && c.status !== "needs_attention").length;
  const allReviewed = reviewedCount >= candidates.length;

  const playClip = useCallback(() => {
    if (!current) return;
    videoRef.current?.playFrom(current.clip.startSeconds * 1000);
  }, [current]);

  const advance = useCallback(() => {
    setShowWhy(false);
    setEditing(false);
    setError(null);
    const nextPending = candidates.findIndex(
      (c, i) => i > index && (c.status === "pending_review" || c.status === "needs_attention"),
    );
    if (nextPending !== -1) {
      setIndex(nextPending);
    } else if (index < candidates.length - 1) {
      setIndex(index + 1);
    }
  }, [candidates, index]);

  function patchStatus(id: string, status: CandidateReviewView["status"]) {
    setCandidates((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  async function onApprove() {
    if (!current) return;
    setBusy(true);
    const result = await approveCandidate(current.id);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    patchStatus(current.id, "approved");
    setApproved((n) => n + (current.status === "approved" || current.status === "edited" ? 0 : 1));
    advance();
  }

  async function onReject() {
    if (!current) return;
    setBusy(true);
    const wasApproved = current.status === "approved" || current.status === "edited";
    const result = await rejectCandidate(current.id);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    patchStatus(current.id, "rejected");
    if (wasApproved) setApproved((n) => Math.max(0, n - 1));
    advance();
  }

  async function onStartSession() {
    setStarting(true);
    setError(null);
    const result = await buildSessionFromApproved(jobId);
    if (!result.ok) {
      setStarting(false);
      setError(result.error);
      return;
    }
    router.push(`/sessions/${result.data.sessionId}`);
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="display-3 text-fg">Nothing to review.</p>
        <p className="max-w-prose text-sm text-fg-soft">
          The analysis didn&rsquo;t produce any moments to look at.
        </p>
        <ButtonLink href={`/games/${gameId}/analysis`} variant="secondary">
          Back to analysis
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="label-caps text-fg-faint">
          {reviewedCount} of {candidates.length} reviewed &middot; {approved} kept
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {candidates.map((c, i) => (
            <span
              key={c.id}
              className={`h-1 w-5 rounded-full ${
                c.status === "approved" || c.status === "edited"
                  ? "bg-accent"
                  : c.status === "rejected"
                    ? "bg-line-strong"
                    : i === index
                      ? "bg-fg-faint"
                      : "bg-sunken"
              }`}
            />
          ))}
        </div>
      </div>

      {current ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-frame border border-line bg-surface">
              <div className="relative">
                <VideoSurface
                  ref={videoRef}
                  source={source}
                  muted={false}
                  stopAtMs={current.clip.decisionSeconds * 1000}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
                <span className="label-caps text-fg-faint">
                  Target: {current.target.teamColor} #{current.target.jerseyNumber} &middot; decision at{" "}
                  {clock(current.clip.decisionSeconds)}
                </span>
                <Button variant="secondary" size="sm" onClick={playClip}>
                  Play to the decision
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {editing ? (
                <EditForm
                  candidate={current}
                  onCancel={() => setEditing(false)}
                  onSaved={(updated) => {
                    setCandidates((list) => list.map((c) => (c.id === updated.id ? updated : c)));
                    setEditing(false);
                    if (updated.status === "edited" && current.status !== "approved" && current.status !== "edited") {
                      setApproved((n) => n + 1);
                    }
                  }}
                  setError={setError}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <p className="display-3 text-fg">{current.title}</p>
                    <p className="text-sm leading-relaxed text-fg-soft">{current.situation}</p>
                  </div>

                  <p className="decision-mark text-[0.95rem] font-semibold leading-snug text-fg">
                    {current.prompt}
                  </p>

                  <ul className="flex flex-col gap-2">
                    {current.choices.map((choice, i) => {
                      const best = choice.id === current.recommendedChoiceId;
                      return (
                        <li
                          key={choice.id}
                          className={`flex items-start gap-3 rounded-control border px-3 py-2.5 text-sm ${
                            best ? "border-accent bg-raised text-fg" : "border-line bg-surface text-fg-soft"
                          }`}
                        >
                          <span className="timecode mt-0.5 text-fg-faint">{String.fromCharCode(65 + i)}</span>
                          <span className="flex-1">{choice.text}</span>
                          {best ? <span className="label-caps text-accent">Best read</span> : null}
                        </li>
                      );
                    })}
                  </ul>

                  {current.outcome ? (
                    <p className="text-sm text-fg-soft">
                      <span className="label-caps mr-2 text-fg-faint">What happened</span>
                      {current.outcome}
                    </p>
                  ) : null}
                  {current.explanation ? (
                    <p className="text-sm leading-relaxed text-fg-soft">{current.explanation}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowWhy((v) => !v)}
                    className="self-start rounded-xs text-[0.8125rem] font-medium text-fg underline underline-offset-4"
                  >
                    {showWhy ? "Hide" : "Why this moment?"}
                  </button>

                  {showWhy ? (
                    <div className="flex flex-col gap-3 rounded-panel border border-line bg-raised p-3.5 text-[0.8125rem] text-fg-soft">
                      {current.why.involvement ? (
                        <p>
                          <span className="label-caps mr-2 text-fg-faint">Involvement</span>
                          {current.why.involvement}
                        </p>
                      ) : null}
                      {current.why.evidence.length > 0 ? (
                        <div>
                          <p className="label-caps mb-1 text-fg-faint">Visible evidence</p>
                          <ul className="flex flex-col gap-1">
                            {current.why.evidence.map((e, i) => (
                              <li key={i}>
                                <span className="timecode mr-2 text-fg-faint">{clock(e.timestampSeconds)}</span>
                                {e.observation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {current.why.coachPreferences.length > 0 ? (
                        <div>
                          <p className="label-caps mb-1 text-fg-faint">Coach preference used</p>
                          <ul className="flex flex-col gap-1">
                            {current.why.coachPreferences.map((p, i) => (
                              <li key={i}>{p.influence}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {current.why.uncertainty.length > 0 ? (
                        <p>
                          <span className="label-caps mr-2 text-fg-faint">Uncertain</span>
                          {current.why.uncertainty.join("; ")}
                        </p>
                      ) : null}
                      <p className="text-fg-faint">
                        Player match{" "}
                        {current.why.playerIdConfidence != null
                          ? `${Math.round(current.why.playerIdConfidence * 100)}%`
                          : "—"}{" "}
                        &middot; decision clarity{" "}
                        {current.why.decisionConfidence != null
                          ? `${Math.round(current.why.decisionConfidence * 100)}%`
                          : "—"}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}

          {!editing ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void onApprove()} disabled={busy}>
                {current.status === "approved" || current.status === "edited" ? "Kept" : "Approve"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                Edit
              </Button>
              <Button variant="ghost" onClick={() => void onReject()} disabled={busy}>
                Reject
              </Button>
              <span className="ml-auto text-sm text-fg-faint">
                {index + 1} / {candidates.length}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <SectionLabel>{allReviewed ? "All reviewed" : "When you're ready"}</SectionLabel>
        <p className="max-w-prose text-sm text-fg-soft">
          {approved > 0
            ? `${approved} ${approved === 1 ? "moment" : "moments"} will become reps for your player.`
            : "Approve at least one moment to build a session."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void onStartSession()} disabled={approved === 0 || starting} size="lg">
            {starting ? "Building…" : "Start player session"}
          </Button>
          <ButtonLink href={`/games/${gameId}/advanced`} variant="ghost">
            Add a moment manually
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function EditForm({
  candidate,
  onCancel,
  onSaved,
  setError,
}: {
  candidate: CandidateReviewView;
  onCancel: () => void;
  onSaved: (updated: CandidateReviewView) => void;
  setError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(candidate.title);
  const [situation, setSituation] = useState(candidate.situation);
  const [prompt, setPrompt] = useState(candidate.prompt);
  const [explanation, setExplanation] = useState(candidate.explanation ?? "");
  const [choices, setChoices] = useState(candidate.choices.map((c) => ({ ...c })));
  const [recommendedChoiceId, setRecommendedChoiceId] = useState(candidate.recommendedChoiceId ?? "");
  const [saving, setSaving] = useState(false);

  const valid = useMemo(
    () =>
      title.trim().length > 0 &&
      situation.trim().length > 0 &&
      prompt.trim().length > 0 &&
      choices.length >= 2 &&
      choices.every((c) => c.text.trim().length > 0) &&
      choices.some((c) => c.id === recommendedChoiceId),
    [title, situation, prompt, choices, recommendedChoiceId],
  );

  async function save() {
    setSaving(true);
    setError(null);
    const result = await editCandidate({
      candidateId: candidate.id,
      title: title.trim(),
      situation: situation.trim(),
      prompt: prompt.trim(),
      explanation: explanation.trim() || undefined,
      choices: choices.map((c) => ({ id: c.id, text: c.text.trim() })),
      recommendedChoiceId,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved({
      ...candidate,
      status: "edited",
      title: title.trim(),
      situation: situation.trim(),
      prompt: prompt.trim(),
      explanation: explanation.trim() || null,
      choices: choices.map((c) => ({ id: c.id, text: c.text.trim() })),
      recommendedChoiceId,
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Title">
        <input className={inputClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Situation">
        <textarea
          className={textareaClass}
          rows={2}
          value={situation}
          maxLength={240}
          onChange={(e) => setSituation(e.target.value)}
        />
      </Field>
      <Field label="Question">
        <textarea
          className={textareaClass}
          rows={2}
          value={prompt}
          maxLength={240}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="label-caps text-fg-faint">Choices &middot; select the best read</span>
        {choices.map((choice, i) => (
          <div key={choice.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="best-read"
              checked={recommendedChoiceId === choice.id}
              onChange={() => setRecommendedChoiceId(choice.id)}
            />
            <input
              className={inputClass}
              value={choice.text}
              maxLength={120}
              onChange={(e) =>
                setChoices((list) => list.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)))
              }
            />
          </div>
        ))}
      </div>
      <Field label="Explanation">
        <textarea
          className={textareaClass}
          rows={3}
          value={explanation}
          maxLength={600}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </Field>
      <div className="flex gap-3">
        <Button onClick={() => void save()} disabled={!valid || saving}>
          {saving ? "Saving…" : "Save and keep"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
