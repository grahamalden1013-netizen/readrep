"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Flag, MessageSquare, Sparkles, ThumbsUp } from "lucide-react";
import { reportContent } from "@/lib/moderation/actions";
import { EMPTY_REPORT, type ReportState } from "@/lib/moderation/action-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Composer } from "./composer";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  { value: "personal-attack", label: "Attacks a person rather than an idea" },
  { value: "personal-information", label: "Contains someone's personal information" },
  { value: "misinformation", label: "States something factually false" },
  { value: "spam", label: "Spam or advertising" },
  { value: "other", label: "Something else" },
];

/**
 * Like / reply / report controls shared by article comments and discussion
 * responses. Every control does something real: the like is local, the reply
 * opens a composer that runs moderation, and the report files a flag.
 */
export function PostActions({
  subjectId,
  likeLabel,
  likeCount,
  signedIn,
  signInHref,
  viewer,
}: {
  subjectId: string;
  likeLabel: "Thoughtful" | "Made me think";
  likeCount: number;
  signedIn: boolean;
  signInHref: string;
  viewer?: { displayName: string; initials: string; hue: number } | null;
}) {
  const [liked, setLiked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportState, reportAction, reportPending] = useActionState<
    ReportState,
    FormData
  >(reportContent, EMPTY_REPORT);

  const LikeIcon = likeLabel === "Thoughtful" ? ThumbsUp : Sparkles;

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => signedIn && setLiked((value) => !value)}
          aria-pressed={liked}
          disabled={!signedIn}
          title={signedIn ? undefined : "Sign in to react"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] transition-colors disabled:cursor-not-allowed",
            liked
              ? "bg-accent-soft text-accent"
              : "bg-surface-2 text-ink-2 hover:text-ink",
          )}
        >
          <LikeIcon className="size-3" aria-hidden />
          {likeLabel} · {likeCount + (liked ? 1 : 0)}
        </button>

        <button
          type="button"
          onClick={() => setReplying((value) => !value)}
          className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-3 transition-colors hover:text-ink"
          aria-expanded={replying}
        >
          <MessageSquare className="size-3" aria-hidden />
          Reply
        </button>

        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-1 text-[0.6875rem] text-ink-3 transition-colors hover:text-danger"
        >
          <Flag className="size-3" aria-hidden />
          Report
        </button>
      </div>

      {replying && (
        <div className="mt-4">
          {signedIn ? (
            <Composer
              signedIn={signedIn}
              signInHref={signInHref}
              viewer={viewer}
              placeholder="Reply to this — engage with the argument, not the person."
              submitLabel="Post reply"
            />
          ) : (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-[0.8125rem] leading-5 text-ink-2">
              <Link href={signInHref} className="font-medium text-accent hover:underline">
                Sign in
              </Link>{" "}
              to reply.
            </p>
          )}
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <div className="border-b border-hairline px-6 py-5">
            <DialogTitle className="text-[1.0625rem] font-semibold tracking-tight text-ink">
              Report this post
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[0.8125rem] leading-5 text-ink-3">
              Reports go to an editor. Reporting is not a disagree button —
              disagreement belongs in a reply.
            </DialogDescription>
          </div>

          <form action={reportAction} className="p-6">
            <input type="hidden" name="subjectId" value={subjectId} />
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-start gap-3 rounded-xl border border-hairline p-3.5 transition-colors hover:bg-surface-2"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    required
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span className="text-[0.875rem] leading-5 text-ink-2">
                    {reason.label}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={reportPending}>
                {reportPending ? "Filing..." : "Submit report"}
              </Button>
            </div>

            {reportState.status !== "idle" && (
              <p
                role="status"
                className={cn(
                  "mt-4 rounded-lg px-3.5 py-3 text-[0.8125rem] leading-5",
                  reportState.status === "filed"
                    ? "bg-accent-soft text-ink-2"
                    : "bg-danger-soft text-ink-2",
                )}
              >
                {reportState.message}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
