"use client";

import { useState } from "react";
import { CornerDownLeft, MessageCircleQuestion } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AskResponse } from "@/lib/ai/types";

const QUICK_QUESTIONS = [
  "Why does this matter?",
  "What happened before this?",
  "What do Democrats think?",
  "What do Republicans think?",
  "What could happen next?",
];

interface Exchange {
  question: string;
  answer: AskResponse | null;
  error?: string;
}

export function AskNgn({ slug }: { slug: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setQuestion("");
    setLoading(true);
    setExchanges((prev) => [...prev, { question: trimmed, answer: null }]);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");

      setExchanges((prev) =>
        prev.map((exchange, index) =>
          index === prev.length - 1
            ? { ...exchange, answer: data as AskResponse }
            : exchange,
        ),
      );
    } catch {
      setExchanges((prev) =>
        prev.map((exchange, index) =>
          index === prev.length - 1
            ? {
                ...exchange,
                error:
                  "That answer could not be loaded. Check your connection and try again.",
              }
            : exchange,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="ask-ngn"
      className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-card"
    >
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="size-4 text-accent" aria-hidden />
          <h2 id="ask-ngn" className="eyebrow text-accent">
            Ask NGN about this story
          </h2>
        </div>
        <p className="mt-2 text-[0.8125rem] leading-5 text-ink-3">
          Answers are drawn from this article and its approved sources only. NGN
          will not tell you which side to take.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {exchanges.length > 0 && (
          <div className="mb-6 space-y-6">
            {exchanges.map((exchange, index) => (
              <div key={`${exchange.question}-${index}`} className="space-y-3">
                <p className="text-[0.9375rem] font-medium text-ink">
                  {exchange.question}
                </p>

                {!exchange.answer && !exchange.error && (
                  <div
                    className="space-y-2.5"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="sr-only">Finding an answer</span>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[88%]" />
                    <Skeleton className="h-3.5 w-[60%]" />
                  </div>
                )}

                {exchange.error && (
                  <p role="alert" className="text-[0.875rem] text-danger">
                    {exchange.error}
                  </p>
                )}

                {exchange.answer && (
                  <div aria-live="polite">
                    <p className="text-[0.9375rem] leading-[1.7] text-ink-2">
                      {exchange.answer.answer}
                    </p>
                    {exchange.answer.citations.length > 0 && (
                      <p className="mt-2.5 flex flex-wrap gap-1.5">
                        {exchange.answer.citations.map((citation) => (
                          <span
                            key={citation}
                            className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-3"
                          >
                            {citation}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(question);
          }}
          className="relative"
        >
          <label htmlFor="ask-input" className="sr-only">
            Ask something about this story
          </label>
          <input
            id="ask-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask something about this story..."
            maxLength={400}
            className="h-12 w-full rounded-xl border border-hairline bg-paper pl-4 pr-12 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-3 hover:border-hairline-strong focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            aria-label="Send question"
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-ink text-paper transition-opacity disabled:opacity-30"
          >
            <CornerDownLeft className="size-4" />
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => submit(quick)}
              disabled={loading}
              className="rounded-full border border-hairline px-3 py-1.5 text-[0.8125rem] text-ink-2 transition-colors hover:border-hairline-strong hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            >
              {quick}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
