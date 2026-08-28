"use client";

import { useState } from "react";
import type { ReportReason } from "@/types/ngn";
import { Button } from "@/components/ui/primitives";

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "harassment", label: "Harassment" },
  { id: "hate", label: "Hate speech or slurs" },
  { id: "threat", label: "Threat of violence" },
  { id: "personal-information", label: "Personal information" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Something else" },
];

/**
 * Reporting. Available from every debate and discussion surface.
 *
 * Reports are rate-limited client-side and again server-side. Moderation
 * outcomes are never shown publicly — a reporter is told their report was
 * received, and nothing about the reported person.
 */
export function ReportButton({ context }: { context: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-faint underline-offset-4 hover:text-ink hover:underline"
      >
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-ink/25" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report content"
            className="animate-rise relative w-full max-w-sm rounded-sm border border-rule bg-paper p-5 shadow-2xl"
          >
            {sent ? (
              <>
                <h2 className="text-lg">Report received</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                  A moderator will review this. We do not share the outcome, and
                  the other student is not told who reported them.
                </p>
                <Button className="mt-5" full onClick={() => setOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg">Report this {context}</h2>
                <p className="mt-1.5 text-sm text-ink-mute">
                  Disagreeing strongly is not a violation. Conduct is.
                </p>
                <div className="mt-4 space-y-1.5">
                  {REASONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setReason(option.id)}
                      aria-pressed={reason === option.id}
                      className={`w-full rounded-sm border px-3 py-2.5 text-left text-sm transition-colors ${
                        reason === option.id
                          ? "border-ink bg-paper-sunken font-medium"
                          : "border-rule hover:border-rule-strong"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <Button full disabled={!reason} onClick={() => setSent(true)}>
                    Send report
                  </Button>
                  <Button tone="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
