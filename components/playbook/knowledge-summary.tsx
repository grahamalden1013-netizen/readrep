"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { confirmKnowledge, retireKnowledge } from "@/lib/interview/actions";
import type { FactView, InterviewView } from "@/lib/interview/view";

/**
 * "What ReadRep knows" — small, quiet, and collapsed by default.
 *
 * The coach is here to talk basketball, not to watch a database populate. This
 * shows short phrases grouped the way a coach thinks, with the ability to
 * correct anything wrong and to confirm anything ReadRep only guessed.
 */

function Fact({
  fact,
  teamId,
  onRemoved,
  onConfirmed,
}: {
  fact: FactView;
  teamId: string;
  onRemoved: (id: string) => void;
  onConfirmed: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (fn: () => Promise<{ ok: boolean; message?: string }>, after: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) after();
      else setError(result.message ?? "That didn't work.");
    });
  };

  return (
    <li className="group flex flex-col gap-0.5 py-1">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "flex-1 text-[13px] leading-relaxed",
            fact.provenance === "inferred" ? "text-muted-foreground italic" : "text-foreground",
          )}
        >
          {fact.label}
          {fact.scope && (
            <span className="ml-1.5 text-[11px] not-italic text-faint-foreground">{fact.scope}</span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {pending ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            <>
              {fact.provenance === "inferred" && (
                <button
                  type="button"
                  onClick={() => act(() => confirmKnowledge(teamId, fact.id), () => onConfirmed(fact.id))}
                  className="rounded px-1 text-[11px] text-muted-foreground hover:text-success"
                  aria-label={`Confirm: ${fact.label}`}
                >
                  Right
                </button>
              )}
              <button
                type="button"
                onClick={() => act(() => retireKnowledge(teamId, fact.id), () => onRemoved(fact.id))}
                className="rounded px-1 text-[11px] text-faint-foreground hover:text-danger"
                aria-label={`Remove: ${fact.label}`}
              >
                Wrong
              </button>
            </>
          )}
        </span>
      </div>

      {fact.children.length > 0 && (
        <ul className="ml-3 flex flex-col border-l border-border pl-2.5">
          {fact.children.map((child) => (
            <li key={child.id} className="text-[12px] leading-relaxed text-muted-foreground">
              {child.text}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-[11.5px] text-danger">{error}</p>}
    </li>
  );
}

export function KnowledgeSummary({
  view,
  defaultOpen = false,
}: {
  view: InterviewView;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const groups = view.groups
    .map((g) => ({
      ...g,
      sections: g.sections
        .map((s) => ({ ...s, facts: s.facts.filter((f) => !removed.has(f.id)) }))
        .filter((s) => s.facts.length > 0),
    }))
    .filter((g) => g.sections.length > 0);

  const total = groups.reduce(
    (sum, g) => sum + g.sections.reduce((n, s) => n + s.facts.length, 0),
    0,
  );

  if (total === 0 && view.terms.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-[12.5px] font-medium text-foreground">
          What ReadRep knows{" "}
          <span className="font-mono text-[11.5px] text-muted-foreground">({total})</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-fast)]",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {groups.map((group) => (
            <div key={group.group} className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {group.label}
              </h3>
              {group.sections.map((section) => (
                <div key={section.area} className="flex flex-col">
                  <p className="text-[11.5px] text-faint-foreground">{section.area}</p>
                  <ul className="flex flex-col">
                    {section.facts.map((fact) => (
                      <Fact
                        key={fact.id}
                        fact={
                          confirmed.has(fact.id) ? { ...fact, provenance: "confirmed" } : fact
                        }
                        teamId={view.teamId}
                        onRemoved={(id) => setRemoved((p) => new Set(p).add(id))}
                        onConfirmed={(id) => setConfirmed((p) => new Set(p).add(id))}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}

          {view.terms.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Your language
              </h3>
              <ul className="flex flex-col gap-1">
                {view.terms.map((term) => (
                  <li key={term.id} className="flex gap-2 text-[12.5px]">
                    <span className="w-20 shrink-0 font-mono text-[12px] uppercase text-foreground">
                      {term.term}
                    </span>
                    <span className="flex-1 leading-relaxed text-muted-foreground">
                      {term.meaning}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view.inferredCount > 0 && (
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-faint-foreground">
              <Check className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              Italics are ReadRep&apos;s own guesses — it won&apos;t treat them as things you taught
              until you say they&apos;re right.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
