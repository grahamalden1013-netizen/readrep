"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { sendCoachMessage, startInterview } from "@/lib/interview/actions";
import { KnowledgeSummary } from "@/components/playbook/knowledge-summary";
import type { InterviewView } from "@/lib/interview/view";

/**
 * The coach interview.
 *
 * One question, one answer area, one action. The coach should feel like
 * they're talking basketball with an assistant coach who already knows the
 * game — not operating an AI control panel. Everything ReadRep has worked out
 * is one collapsed disclosure away, not spread across the screen.
 */

export function CoachInterview({
  initialView,
  isMock,
}: {
  initialView: InterviewView;
  isMock: boolean;
}) {
  const [view, setView] = useState(initialView);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [keepGoing, setKeepGoing] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isPending) inputRef.current?.focus();
  }, [isPending, view.currentQuestion]);

  const run = (fn: () => Promise<Awaited<ReturnType<typeof sendCoachMessage>>>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) setView(result.view);
      else setError(result.message);
    });
  };

  const submit = () => {
    const message = draft.trim();
    if (!message || isPending) return;
    setDraft("");
    run(() => sendCoachMessage(view.teamId, message));
  };

  const started = view.turns.length > 0;
  const finished = view.ended && !keepGoing;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-16">
      {isMock && (
        <Alert tone="warning" title="Mock AI mode">
          This install is running scripted responses, not a real model. Unset{" "}
          <code className="font-mono text-[12.5px]">READREP_AI_MODE</code> and set{" "}
          <code className="font-mono text-[12.5px]">ANTHROPIC_API_KEY</code> for real intelligence.
        </Alert>
      )}

      {/* --- Not started ---------------------------------------------------- */}
      {!started && (
        <div className="rr-animate-in flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
              Teach ReadRep how your team plays
            </h1>
            <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              A few good questions, answered the way you&apos;d talk to an assistant coach.
              ReadRep won&apos;t ask what a drop coverage is — it&apos;ll ask what you want out of
              one, and stop as soon as it can read your film.
            </p>
          </div>
          <div>
            <Button size="lg" onClick={() => run(() => startInterview(view.teamId))} loading={isPending}>
              Start
            </Button>
          </div>
        </div>
      )}

      {/* --- Film-ready ------------------------------------------------------ */}
      {finished && (
        <div className="rr-animate-in flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success-soft px-6 py-6">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden="true" />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-success">
                Film-ready
              </span>
            </div>
            <p className="text-[19px] leading-snug text-success-soft-foreground">
              I know enough to start reading film like your staff.
            </p>
            <p className="max-w-prose text-[13.5px] leading-relaxed text-success-soft-foreground opacity-90">
              ReadRep will keep learning from your corrections and from what it sees on film. You
              can teach it something new any time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <LinkButton href="/coach/playbook">Finish</LinkButton>
            <Button variant="secondary" onClick={() => setKeepGoing(true)}>
              Keep teaching ReadRep
            </Button>
          </div>
        </div>
      )}

      {/* --- The question ---------------------------------------------------- */}
      {started && !finished && (
        <div className="rr-animate-in flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <p
              className="text-[11.5px] font-semibold uppercase tracking-wide text-primary"
              aria-live="polite"
            >
              {view.readiness.headline}
            </p>
            <p
              key={view.currentQuestion}
              className="rr-animate-in max-w-prose text-[22px] font-medium leading-snug tracking-tight text-foreground sm:text-[24px]"
            >
              {isPending ? (
                <span className="text-muted-foreground">Thinking…</span>
              ) : (
                view.currentQuestion
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={5}
              placeholder="However much you want to say."
              aria-label="Your answer"
              disabled={isPending}
              className={cn(
                "w-full resize-y rounded-lg border border-border-strong bg-surface px-4 py-3.5",
                "text-[15px] leading-relaxed text-foreground outline-none transition-colors",
                "placeholder:text-faint-foreground focus:border-primary/50 disabled:opacity-60",
              )}
            />

            {view.suggestions.length > 0 && !isPending && (
              <div className="flex flex-wrap gap-2">
                {view.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft((d) => (d.trim() ? `${d.trim()} ${s}` : s))}
                    className="rounded-full border border-border-strong bg-surface-2 px-3 py-1 text-[12.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={submit} disabled={!draft.trim()} loading={isPending}>
                Send
                {!isPending && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
              <span className="text-[11.5px] text-faint-foreground">
                ⌘↵ to send · leave and come back anytime
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert tone="danger" title="That didn't go through">
          {error}
        </Alert>
      )}

      <KnowledgeSummary view={view} defaultOpen={finished} />
    </div>
  );
}
