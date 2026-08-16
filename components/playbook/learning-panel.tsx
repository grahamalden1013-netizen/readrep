"use client";

import { useState, useTransition } from "react";
import { Check, CircleDashed, Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { retireKnowledge } from "@/lib/interview/actions";
import type { InterviewView, ReadView, TopicView } from "@/lib/interview/view";

/**
 * "ReadRep is learning your team" — the live model of the team's system,
 * rebuilt after every turn.
 *
 * This is deliberately the structured knowledge, not a prettied-up transcript:
 * the coach should be able to see exactly what ReadRep will reason from, and
 * strike anything that's wrong.
 */

function statusIcon(status: TopicView["status"]) {
  if (status === "covered") return <Check className="size-3.5 text-success" aria-hidden="true" />;
  if (status === "not_applicable")
    return <X className="size-3.5 text-faint-foreground" aria-hidden="true" />;
  return (
    <CircleDashed
      className={cn("size-3.5", status === "partial" ? "text-primary" : "text-faint-foreground")}
      aria-hidden="true"
    />
  );
}

function CoverageBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="How much of your system ReadRep understands"
    >
      <div
        className="h-full rounded-full bg-primary-fill transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ReadCard({
  read,
  teamId,
  onRetired,
}: {
  read: ReadView;
  teamId: string;
  onRetired: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="rr-animate-in rounded-lg border border-border bg-surface px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {read.scope}
          </span>
          <span className="text-[11px] text-faint-foreground">{read.topicLabel}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await retireKnowledge(teamId, read.id);
              if (result.ok) onRetired(read.id);
              else setError(result.message);
            });
          }}
          disabled={pending}
          className="shrink-0 rounded px-1 text-[11px] text-faint-foreground transition-colors hover:text-danger disabled:opacity-50"
          aria-label={`Remove: ${read.text}`}
        >
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : "Not right"}
        </button>
      </div>

      <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">
        <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{read.priority}.</span>
        {read.text}
      </p>

      {read.children.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 border-l border-border-strong pl-3">
          {read.children.map((child) => (
            <li key={child.id} className="text-[12.5px] leading-relaxed text-muted-foreground">
              {child.text}
            </li>
          ))}
        </ul>
      )}

      {read.source === "inferred" && (
        <p className="mt-1.5 text-[11.5px] text-warning">
          ReadRep filled this in — confirm or correct it.
        </p>
      )}
      {error && <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
    </li>
  );
}

export function LearningPanel({ view }: { view: InterviewView }) {
  const [retired, setRetired] = useState<Set<string>>(new Set());
  const reads = view.reads.filter((r) => !retired.has(r.id));

  const tracked = view.topics.filter((t) => t.applicable && t.status !== "not_applicable");
  const covered = tracked.filter((t) => t.status === "covered").length;

  return (
    <aside
      className="flex flex-col gap-6"
      aria-label="What ReadRep has learned about your team"
    >
      <section className="rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-[13.5px] font-medium text-foreground">
            ReadRep is learning {view.teamName}
          </h2>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[26px] leading-none text-foreground">
            {Math.round(view.overall * 100)}%
          </span>
          <span className="text-[12px] text-muted-foreground">
            {covered} of {tracked.length} areas covered
          </span>
        </div>
        <div className="mt-2.5">
          <CoverageBar value={view.overall} />
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {view.filmReady ? (
            <span className="text-success-soft-foreground">
              Film-ready. ReadRep understands enough to coach a possession the way you would. Keep
              going to sharpen it.
            </span>
          ) : view.missingCritical.length > 0 ? (
            <>Still needs: {view.missingCritical.slice(0, 3).join(", ")}.</>
          ) : (
            <>A little more depth and ReadRep will be ready to work film.</>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint-foreground">
          Coverage
        </h3>
        <ul className="flex flex-col">
          {tracked.map((topic) => (
            <li
              key={topic.id}
              className="flex items-center gap-2.5 border-b border-border py-1.5 last:border-b-0"
            >
              {statusIcon(topic.status)}
              <span
                className={cn(
                  "flex-1 text-[12.5px]",
                  topic.status === "unknown" ? "text-faint-foreground" : "text-foreground",
                )}
              >
                {topic.label}
              </span>
              {topic.filmCritical && topic.status === "unknown" && (
                <Badge tone="neutral" className="text-[10px]">
                  needed
                </Badge>
              )}
              {topic.nodeCount > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {topic.nodeCount}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {reads.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint-foreground">
            What ReadRep understands
          </h3>
          <ul className="flex flex-col gap-2">
            {reads.map((read) => (
              <ReadCard
                key={read.id}
                read={read}
                teamId={view.teamId}
                onRetired={(id) => setRetired((prev) => new Set(prev).add(id))}
              />
            ))}
          </ul>
        </section>
      )}

      {view.terms.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint-foreground">
            Your language
          </h3>
          <ul className="flex flex-col gap-1.5">
            {view.terms.map((term) => (
              <li key={term.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <span className="font-mono text-[12.5px] font-semibold uppercase tracking-wide text-primary sm:w-24 sm:shrink-0">
                  {term.term}
                </span>
                <span className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {term.meaning}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.ambiguities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-faint-foreground">
            Still unclear
          </h3>
          <ul className="flex flex-col gap-1">
            {view.ambiguities.map((a) => (
              <li key={a} className="text-[12.5px] leading-relaxed text-muted-foreground">
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
