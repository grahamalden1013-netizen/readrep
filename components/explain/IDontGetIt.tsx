"use client";

import { useEffect, useRef, useState } from "react";
import { EXPLAINER_MODES, type ExplainerMode } from "@/lib/ai/explainer";
import { explainTopic } from "@/app/actions/arena";
import { Skeleton } from "@/components/ui/primitives";
import { track } from "@/lib/analytics";

/**
 * The "I Don't Get It" panel.
 *
 * Available on every briefing and every article. The modes are fixed prompts,
 * not free text, which is what keeps it an explainer rather than a chatbot a
 * student could steer into taking a political side.
 */

type Cache = Partial<Record<ExplainerMode, { text: string; source: string }>>;

export function IDontGetIt({
  topic,
  context,
  variant = "button",
}: {
  topic: string;
  context: string;
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExplainerMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Cache>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function choose(next: ExplainerMode) {
    setMode(next);
    track("explainer_opened", { mode: next, topic });

    if (cache[next]) return;

    setLoading(true);
    try {
      const result = await explainTopic({ mode: next, topic, context });
      setCache((prev) => ({ ...prev, [next]: result }));
    } catch {
      setCache((prev) => ({
        ...prev,
        [next]: {
          text: "That explanation could not be generated right now. The briefing on this page covers the same ground.",
          source: "briefing",
        },
      }));
    } finally {
      setLoading(false);
    }
  }

  const current = mode ? cache[mode] : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "inline"
            ? "inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
            : "inline-flex h-11 items-center gap-2 rounded-sm border border-rule-strong bg-paper-raised px-4 text-sm font-medium transition-colors hover:border-ink"
        }
      >
        <span aria-hidden className="text-base leading-none">?</span>
        I don&apos;t get it
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/25"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Explain this topic"
            className="animate-rise relative flex h-full w-full max-w-md flex-col border-l border-rule bg-paper shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
              <div className="min-w-0">
                <p className="eyebrow text-ink-mute">Ask NGN</p>
                <h2 className="mt-1.5 line-clamp-2 text-lg leading-snug">{topic}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-sm p-1.5 text-ink-mute hover:bg-paper-sunken hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                {EXPLAINER_MODES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => choose(option.id)}
                    aria-pressed={mode === option.id}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-sm border px-4 py-3 text-left transition-colors ${
                      mode === option.id
                        ? "border-ink bg-paper-raised"
                        : "border-rule bg-paper-raised hover:border-rule-strong"
                    }`}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-ink-mute">{option.hint}</span>
                  </button>
                ))}
              </div>

              {mode && (
                <div className="mt-6 border-t border-rule pt-5">
                  {loading ? (
                    <div className="space-y-2.5" aria-busy>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-11/12" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ) : current ? (
                    <>
                      <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
                        {current.text}
                      </p>
                      <p className="mt-4 text-xs text-ink-faint">
                        {current.source === "model"
                          ? "Generated by NGN's explainer, grounded in this page's briefing. It will not tell you which side to take."
                          : "Drawn from this page's neutral briefing."}
                      </p>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="border-t border-rule px-5 py-4">
              <p className="text-xs leading-relaxed text-ink-mute">
                NGN explains the disagreement. It never tells you who is right.
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
