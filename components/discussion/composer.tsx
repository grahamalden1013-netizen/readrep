"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { submitForReview } from "@/lib/moderation/actions";
import {
  EMPTY_SUBMISSION,
  type SubmissionState,
} from "@/lib/moderation/action-types";
import { DISCUSSION_REMINDER } from "@/lib/moderation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Shared composer for article comments and discussion responses.
 *
 * The reminder is shown before posting, not after — it is a prompt, not a
 * punishment.
 */
export function Composer({
  signedIn,
  signInHref,
  placeholder = "Add your response...",
  submitLabel = "Post response",
  viewer,
}: {
  signedIn: boolean;
  signInHref: string;
  placeholder?: string;
  submitLabel?: string;
  viewer?: { displayName: string; initials: string; hue: number } | null;
}) {
  const [state, action, pending] = useActionState<SubmissionState, FormData>(
    submitForReview,
    EMPTY_SUBMISSION,
  );

  if (!signedIn) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-2 p-5">
        <p className="text-[0.875rem] leading-6 text-ink-2">
          <Link
            href={signInHref}
            className="font-medium text-accent hover:underline"
          >
            Sign in
          </Link>{" "}
          to join the conversation. NGN discussions are moderated, and reading
          never requires an account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
      <div className="flex items-start gap-2.5 rounded-lg bg-surface-2 px-3.5 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        <p className="text-[0.8125rem] leading-5 text-ink-2">
          <span className="font-semibold text-ink">{DISCUSSION_REMINDER}</span>{" "}
          Responses are screened before they appear.
        </p>
      </div>

      <form action={action} className="mt-4">
        <div className="flex gap-3">
          {viewer && (
            <Avatar
              initials={viewer.initials}
              hue={viewer.hue}
              size="md"
              className="mt-0.5"
            />
          )}
          <div className="flex-1">
            <label htmlFor="composer-body" className="sr-only">
              Your response
            </label>
            <Textarea
              id="composer-body"
              name="body"
              rows={4}
              maxLength={2000}
              placeholder={placeholder}
              required
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[0.6875rem] text-ink-3">
                Up to 2000 characters.
              </p>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Checking..." : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {state.status !== "idle" && (
        <div
          role="status"
          className={cn(
            "mt-4 flex gap-2.5 rounded-lg px-3.5 py-3 text-[0.8125rem] leading-5",
            state.status === "approved"
              ? "bg-accent-soft text-ink-2"
              : "bg-danger-soft text-ink-2",
          )}
        >
          {state.status === "approved" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          ) : (
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {state.status === "approved" && state.body && state.author && (
        <div className="mt-4 rounded-lg border border-hairline p-4">
          <div className="flex items-center gap-2.5">
            <Avatar
              initials={state.author.initials}
              hue={state.author.hue}
              size="sm"
            />
            <span className="text-[0.8125rem] font-semibold text-ink">
              {state.author.displayName}
            </span>
            <span className="text-[0.6875rem] text-ink-3">just now</span>
          </div>
          <p className="mt-2.5 text-[0.9375rem] leading-[1.6] text-ink-2">
            {state.body}
          </p>
          <p className="mt-3 text-[0.6875rem] text-ink-3">
            Demo build: your response is shown to you but not stored. Connect
            Supabase to persist it.
          </p>
        </div>
      )}
    </div>
  );
}
