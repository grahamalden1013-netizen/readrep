"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Rewind,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ExplainMode, ExplainResponse } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  mode: ExplainMode;
  label: string;
  hint: string;
  Icon: typeof Timer;
}[] = [
  {
    mode: "sixty-seconds",
    label: "Give me the 60-second version",
    hint: "The whole story, fast, without losing the point.",
    Icon: Timer,
  },
  {
    mode: "background",
    label: "Explain the background",
    hint: "What happened before this, so today makes sense.",
    Icon: Rewind,
  },
  {
    mode: "from-scratch",
    label: "Explain it like I'm completely new to politics",
    hint: "No assumed knowledge. Every institution defined.",
    Icon: BookOpen,
  },
  {
    mode: "define-terms",
    label: "Define the important terms",
    hint: "The vocabulary this story assumes you already know.",
    Icon: Sparkles,
  },
];

export function IDontGetIt({
  slug,
  variant = "default",
}: {
  slug: string;
  variant?: "default" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExplainMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: ExplainMode) {
    setMode(next);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mode: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setResult(data as ExplainResponse);
    } catch {
      setError(
        "That explanation could not be loaded. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode(null);
    setResult(null);
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent-soft px-4 font-medium text-accent transition-all duration-200 hover:border-accent/60 hover:shadow-card active:scale-[0.98]",
            variant === "compact" ? "h-9 text-[0.8125rem]" : "h-11 text-[0.9375rem]",
          )}
        >
          <HelpCircle className="size-4 transition-transform duration-300 group-hover:rotate-12" />
          I don&rsquo;t get it
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <div className="border-b border-hairline px-6 py-5">
          <DialogTitle className="text-[1.125rem] font-semibold tracking-[-0.02em] text-ink">
            {mode ? result?.title ?? "Working on it" : "What would help?"}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[0.8125rem] leading-5 text-ink-3">
            {mode
              ? "Answered only from this story and its approved sources."
              : "Pick the version you need. Nothing here adds facts the story does not already establish."}
          </DialogDescription>
        </div>

        <div className="p-6">
          {!mode && (
            <ul className="space-y-2.5">
              {OPTIONS.map(({ mode: optionMode, label, hint, Icon }) => (
                <li key={optionMode}>
                  <button
                    type="button"
                    onClick={() => choose(optionMode)}
                    className="flex w-full items-start gap-3.5 rounded-xl border border-hairline bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-hairline-strong hover:shadow-card"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[0.9375rem] font-medium text-ink">
                        {label}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-5 text-ink-3">
                        {hint}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mode && loading && (
            <div className="space-y-3" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading explanation</span>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[97%]" />
              <Skeleton className="h-4 w-[64%]" />
            </div>
          )}

          {mode && error && (
            <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3">
              <p className="text-[0.875rem] text-ink-2">{error}</p>
            </div>
          )}

          {mode && result && (
            <div className="space-y-4" aria-live="polite">
              {result.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[0.9375rem] leading-[1.7] text-ink-2"
                >
                  {paragraph}
                </p>
              ))}

              {result.terms && result.terms.length > 0 && (
                <dl className="space-y-3 rounded-xl border border-hairline bg-surface-2 p-4">
                  {result.terms.map((term) => (
                    <div key={term.term}>
                      <dt className="text-[0.875rem] font-semibold text-ink">
                        {term.term}
                      </dt>
                      <dd className="mt-1 text-[0.8125rem] leading-[1.6] text-ink-2">
                        {term.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {mode && !loading && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline pt-5">
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="size-3.5" />
                Other options
              </Button>
              <p className="text-[0.6875rem] text-ink-3">
                Answers come only from this article and its sources.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
