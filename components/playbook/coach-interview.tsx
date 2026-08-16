"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendCoachMessage, startInterview } from "@/lib/interview/actions";
import { LearningPanel } from "@/components/playbook/learning-panel";
import type { InterviewView } from "@/lib/interview/view";

/**
 * The coach interview.
 *
 * A conversation, not a form: ReadRep asks one question, reads the answer, and
 * decides what to ask next. The panel beside it shows the structured model it
 * is building in real time, so teaching it never feels like typing into a void.
 */

type Pending = { id: string; content: string };

export function CoachInterview({
  initialView,
  mode,
}: {
  initialView: InterviewView;
  mode: "live" | "mock";
}) {
  const [view, setView] = useState(initialView);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(initialView.turns.length > 0);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [view.turns.length, pending, isPending]);

  const run = (fn: () => Promise<Awaited<ReturnType<typeof sendCoachMessage>>>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setView(result.view);
        setPending(null);
        setStarted(true);
      } else {
        setError(result.message);
        setPending(null);
      }
      inputRef.current?.focus();
    });
  };

  const submit = () => {
    const message = draft.trim();
    if (!message || isPending) return;
    setDraft("");
    // Show the coach's words immediately; the server is the source of truth
    // once the turn resolves.
    setPending({ id: `pending-${Date.now()}`, content: message });
    run(() => sendCoachMessage(view.teamId, message));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:flex-row lg:gap-12">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="rr-animate-in flex flex-col gap-1.5">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
            Teach ReadRep how your team plays
          </h1>
          <p className="max-w-prose text-[14px] leading-relaxed text-muted-foreground">
            Answer the way you&apos;d talk to an assistant coach. ReadRep listens, asks what it
            still needs, and builds the model on the right as you go.
          </p>
        </div>

        {mode === "mock" && (
          <div className="mt-5">
            <Alert tone="warning" title="Mock AI mode">
              This install is running scripted responses, not a real model. Set{" "}
              <code className="font-mono text-[12.5px]">ANTHROPIC_API_KEY</code> and unset{" "}
              <code className="font-mono text-[12.5px]">READREP_AI_MODE</code> for real intelligence.
            </Alert>
          </div>
        )}

        <div className="mt-6 flex flex-1 flex-col gap-5">
          {!started && view.turns.length === 0 && (
            <div className="rr-animate-in flex flex-col items-start gap-4 rounded-lg border border-dashed border-border-strong px-6 py-8">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                <Sparkles className="size-4.5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-foreground">
                  ReadRep knows basketball. It doesn&apos;t know you yet.
                </p>
                <p className="mt-1 max-w-prose text-[13.5px] leading-relaxed text-muted-foreground">
                  It won&apos;t ask you what a drop coverage is. It&apos;ll ask what your ball
                  handler is supposed to do against one — and then what changes when the big steps
                  up.
                </p>
              </div>
              <Button
                onClick={() => run(() => startInterview(view.teamId))}
                loading={isPending}
              >
                Start the interview
              </Button>
            </div>
          )}

          <ol className="flex flex-col gap-5">
            {view.turns.map((turn) => (
              <li
                key={turn.id}
                className={cn(
                  "rr-animate-in flex flex-col gap-1",
                  turn.role === "coach" ? "items-end" : "items-start",
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
                  {turn.role === "coach" ? "You" : "ReadRep"}
                </span>
                <div
                  className={cn(
                    "max-w-[46ch] rounded-lg px-4 py-3 text-[14px] leading-relaxed",
                    turn.role === "coach"
                      ? "bg-surface-2 text-foreground"
                      : "border border-border bg-surface text-foreground",
                  )}
                >
                  {turn.content}
                </div>
              </li>
            ))}

            {pending && (
              <li className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
                  You
                </span>
                <div className="max-w-[46ch] rounded-lg bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-foreground opacity-60">
                  {pending.content}
                </div>
              </li>
            )}

            {isPending && started && (
              <li className="flex flex-col items-start gap-1" aria-live="polite">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
                  ReadRep
                </span>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-primary"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-primary"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="sr-only">ReadRep is thinking</span>
                </div>
              </li>
            )}
          </ol>

          <div ref={endRef} />
        </div>

        {error && (
          <div className="mt-5">
            <Alert tone="danger" title="That turn didn't go through">
              {error}
            </Alert>
          </div>
        )}

        {(started || view.turns.length > 0) && (
          <div className="sticky bottom-0 mt-6 bg-background pt-3">
            <div className="flex items-end gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2.5 focus-within:border-primary/50">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                placeholder="Answer in your own words — as long or short as you want."
                aria-label="Your answer"
                disabled={isPending}
                className="max-h-48 flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-faint-foreground disabled:opacity-60"
              />
              <Button
                size="sm"
                onClick={submit}
                disabled={!draft.trim()}
                loading={isPending}
                aria-label="Send"
                className="shrink-0"
              >
                {!isPending && <ArrowUp className="size-4" aria-hidden="true" />}
              </Button>
            </div>
            <p className="mt-1.5 text-[11.5px] text-faint-foreground">
              Enter to send · Shift+Enter for a new line ·{" "}
              <Link href="/coach/playbook" className="underline underline-offset-2 hover:text-muted-foreground">
                Leave and come back anytime
              </Link>
            </p>
          </div>
        )}
      </div>

      <div className="w-full shrink-0 lg:w-[22rem]">
        <div className="lg:sticky lg:top-8">
          <LearningPanel view={view} />
        </div>
      </div>
    </div>
  );
}
