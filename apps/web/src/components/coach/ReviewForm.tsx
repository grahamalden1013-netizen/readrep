"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateReviewDTO } from "@/server/dal/review";
import { submitReviewAction } from "@/app/(app)/coach/review/actions";
import { QualityBadge } from "@/components/ui/primitives";

const REJECTION_REASONS = [
  ["not_a_real_decision", "Not a real decision"],
  ["wrong_player", "Wrong player"],
  ["wrong_category", "Wrong category"],
  ["not_visible_enough", "Cannot see enough"],
  ["contradicts_our_system", "Contradicts our system"],
  ["too_similar_to_another_moment", "Too similar to another"],
  ["not_useful_for_this_player", "Not useful for this player"],
  ["other", "Other"],
] as const;

/**
 * The coach's decision on one candidate.
 *
 * Built for speed: approving an unchanged proposal is one click, and every edit
 * control stays collapsed until wanted. The proposal is never mutated — edits
 * travel on the review record, so what was proposed and what was approved stay
 * permanently distinguishable.
 */
export function ReviewForm({ candidate }: { candidate: CandidateReviewDTO }) {
  const router = useRouter();
  const [preferredOptionId, setPreferred] = useState(candidate.preferredOptionId);
  const [visualCue, setVisualCue] = useState(candidate.visualCue);
  const [teachingCue, setTeachingCue] = useState(candidate.teachingCue);
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState(0.8);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionDetail, setRejectionDetail] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    preferredOptionId !== candidate.preferredOptionId ||
    visualCue !== candidate.visualCue ||
    teachingCue !== candidate.teachingCue;

  const send = async (verdict: "approved" | "rejected" | "needs_more_evidence") => {
    setPending(true);
    setError(null);
    const result = await submitReviewAction({
      candidateId: candidate.candidateId,
      verdict,
      preferredOptionId: changed ? preferredOptionId : null,
      category: null,
      editedVisualCue: visualCue !== candidate.visualCue ? visualCue : null,
      editedTeachingCue: teachingCue !== candidate.teachingCue ? teachingCue : null,
      note: note.trim() || null,
      confidenceScore: confidence,
      confidenceBasis:
        verdict === "approved"
          ? "Coach reviewed the evidence window and approved."
          : "Coach reviewed the evidence window.",
      rejectionReason: verdict === "rejected" ? rejectionReason || null : null,
      rejectionDetail: verdict === "rejected" ? rejectionDetail.trim() || null : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/coach/review");
    router.refresh();
  };

  if (candidate.existingReview) {
    return (
      <div className="border-ink-700 bg-ink-850 rounded-xl border p-5">
        <p className="text-chalk-200 text-sm leading-relaxed">
          You already {candidate.existingReview.verdict} this moment on{" "}
          {new Date(candidate.existingReview.reviewedAt).toLocaleDateString()}. The
          original proposal and your decision are both kept.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
          Which read do you want?
        </h2>
        <div className="mt-2 space-y-2">
          {candidate.options.map((option) => {
            const selected = option.id === preferredOptionId;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPreferred(option.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-court-500 bg-court-500/10"
                    : "border-ink-700 bg-ink-850 hover:border-ink-500"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-chalk-50 text-sm font-medium">
                    {option.label}
                  </span>
                  <QualityBadge quality={option.quality} />
                  {option.id === candidate.preferredOptionId && (
                    <span className="border-ink-600 bg-ink-800 text-chalk-500 rounded-full border px-2 py-0.5 text-xs">
                      Proposed
                    </span>
                  )}
                </div>
                <p className="text-chalk-400 mt-1.5 text-sm leading-relaxed">
                  {option.rationale}
                </p>
              </button>
            );
          })}
        </div>
        {changed && (
          <p className="text-court-400 mt-2 text-xs">
            Your changes are saved on the review. The original proposal is kept
            unchanged.
          </p>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowEdit((v) => !v)}
          className="text-chalk-400 hover:text-chalk-50 text-sm"
          aria-expanded={showEdit}
        >
          {showEdit ? "Hide" : "Edit"} the teaching language
        </button>
        {showEdit && (
          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="visual-cue"
                className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
              >
                The cue
              </label>
              <textarea
                id="visual-cue"
                rows={2}
                value={visualCue}
                onChange={(e) => setVisualCue(e.target.value)}
                className="border-ink-600 bg-ink-800 text-chalk-50 focus:border-court-500 mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="teaching-cue"
                className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
              >
                Next time
              </label>
              <textarea
                id="teaching-cue"
                rows={2}
                value={teachingCue}
                onChange={(e) => setTeachingCue(e.target.value)}
                className="border-ink-600 bg-ink-800 text-chalk-50 focus:border-court-500 mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="coach-note"
          className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
        >
          Note to the player
        </label>
        <textarea
          id="coach-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — in your own voice."
          className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-1.5 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="confidence"
          className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
        >
          How sure are you this is worth their time?
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="confidence"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="flex-1 accent-[var(--color-court-500)]"
          />
          <span className="text-chalk-200 w-12 text-right font-mono text-sm tabular-nums">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-quality-risk text-sm">
          {error}
        </p>
      )}

      <div className="border-ink-700 flex flex-wrap gap-3 border-t pt-5">
        <button
          type="button"
          disabled={pending}
          onClick={() => void send("approved")}
          className="bg-court-500 text-ink-950 hover:bg-court-400 rounded-lg px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : changed ? "Approve with my changes" : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void send("needs_more_evidence")}
          className="border-ink-600 text-chalk-200 hover:border-ink-500 rounded-lg border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60"
        >
          Need to see more
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowReject((v) => !v)}
          aria-expanded={showReject}
          className="border-ink-600 text-chalk-400 hover:border-quality-risk/50 hover:text-quality-risk rounded-lg border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {showReject && (
        <div className="border-quality-risk/30 bg-quality-risk/5 rounded-xl border p-4">
          <fieldset>
            <legend className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
              Why? This is what makes future proposals better.
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {REJECTION_REASONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rejectionReason === value}
                  onClick={() => setRejectionReason(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    rejectionReason === value
                      ? "border-quality-risk bg-quality-risk/15 text-quality-risk"
                      : "border-ink-600 bg-ink-800 text-chalk-400 hover:border-ink-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <textarea
            rows={2}
            value={rejectionDetail}
            onChange={(e) => setRejectionDetail(e.target.value)}
            placeholder="Anything else worth recording (optional)."
            aria-label="Rejection detail"
            className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-3 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
          />
          <button
            type="button"
            disabled={pending || !rejectionReason}
            onClick={() => void send("rejected")}
            className="bg-quality-risk text-ink-950 mt-3 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm rejection
          </button>
        </div>
      )}
    </div>
  );
}
