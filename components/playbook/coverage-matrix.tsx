"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import {
  COVERAGES,
  COVERAGE_LABELS,
  ROLE_LABELS,
  ROLE_READS,
  rolesForPhase,
  type Coverage,
  type CoverageRole,
} from "@/lib/playbook/questions";
import { saveCoverageRule } from "@/lib/playbook/actions";
import type { CoverageRule } from "@/lib/playbook/queries";

type Key = `${Coverage}:${CoverageRole}`;
const cellKey = (c: Coverage, r: CoverageRole): Key => `${c}:${r}`;

/**
 * The (coverage x role) -> reads editor. A coach opens only the coverages
 * they actually face, and sets what each role is taught to do. Each cell
 * autosaves to its own row, which is what makes situation-scoped retrieval
 * ("side P&R vs drop") possible later.
 */
export function CoverageMatrix({
  teamId,
  phase,
  initialRules,
  onDirty,
}: {
  teamId: string;
  phase: "offense" | "defense";
  initialRules: CoverageRule[];
  onDirty?: (state: "saving" | "saved" | "error", message?: string) => void;
}) {
  const roles = rolesForPhase(phase);

  const [cells, setCells] = useState<Map<Key, { reads: string[]; note: string }>>(() => {
    const map = new Map<Key, { reads: string[]; note: string }>();
    for (const rule of initialRules.filter((r) => r.phase === phase)) {
      map.set(cellKey(rule.coverage, rule.role), {
        reads: rule.reads ?? [],
        note: rule.note ?? "",
      });
    }
    return map;
  });

  // Coverages start expanded if the coach already has data for them.
  const [open, setOpen] = useState<Set<Coverage>>(() => {
    const s = new Set<Coverage>();
    for (const rule of initialRules.filter((r) => r.phase === phase)) s.add(rule.coverage);
    return s;
  });

  const [, startTransition] = useTransition();

  function cell(c: Coverage, r: CoverageRole) {
    return cells.get(cellKey(c, r)) ?? { reads: [], note: "" };
  }

  function persist(c: Coverage, r: CoverageRole, next: { reads: string[]; note: string }) {
    onDirty?.("saving");
    startTransition(async () => {
      const result = await saveCoverageRule(teamId, phase, c, r, next.reads, next.note || null);
      onDirty?.(result.ok ? "saved" : "error", result.ok ? undefined : result.message);
    });
  }

  function toggleRead(c: Coverage, r: CoverageRole, read: string) {
    const current = cell(c, r);
    const reads = current.reads.includes(read)
      ? current.reads.filter((x) => x !== read)
      : [...current.reads, read];
    const next = { ...current, reads };
    setCells((prev) => new Map(prev).set(cellKey(c, r), next));
    persist(c, r, next);
  }

  function setNote(c: Coverage, r: CoverageRole, note: string) {
    const next = { ...cell(c, r), note };
    setCells((prev) => new Map(prev).set(cellKey(c, r), next));
  }

  function filledCount(c: Coverage) {
    return roles.filter((r) => cell(c, r).reads.length > 0 || cell(c, r).note.trim()).length;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {COVERAGES.map((coverage) => {
        const isOpen = open.has(coverage);
        const filled = filledCount(coverage);

        return (
          <div
            key={coverage}
            className={cn(
              "overflow-hidden rounded-lg border transition-colors duration-[var(--duration-fast)]",
              filled > 0 ? "border-primary/30 bg-surface" : "border-border bg-surface",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(coverage)) next.delete(coverage);
                  else next.add(coverage);
                  return next;
                })
              }
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex-1 text-[14.5px] font-medium text-foreground">
                {COVERAGE_LABELS[coverage]}
              </span>
              {filled > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] font-medium text-primary">
                  <Check className="size-3" aria-hidden="true" />
                  {filled} of {roles.length} set
                </span>
              )}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-faint-foreground transition-transform duration-[var(--duration-base)]",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
                {roles.map((role) => {
                  const value = cell(coverage, role);
                  return (
                    <div key={role} className="flex flex-col gap-2">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-faint-foreground">
                        {ROLE_LABELS[role]}
                      </p>
                      <div
                        role="group"
                        aria-label={`${COVERAGE_LABELS[coverage]} — ${ROLE_LABELS[role]}`}
                        className="flex flex-wrap gap-1.5"
                      >
                        {ROLE_READS[role].map((read) => {
                          const on = value.reads.includes(read);
                          return (
                            <button
                              key={read}
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => toggleRead(coverage, role, read)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium",
                                "transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)]",
                                "active:scale-[0.97] motion-reduce:active:scale-100",
                                on
                                  ? "border-primary/50 bg-primary-soft text-primary-soft-foreground"
                                  : "border-border-strong bg-surface-2 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {read}
                            </button>
                          );
                        })}
                      </div>
                      <Input
                        value={value.note}
                        placeholder="Your own words (optional)"
                        aria-label={`Note for ${COVERAGE_LABELS[coverage]}, ${ROLE_LABELS[role]}`}
                        onChange={(e) => setNote(coverage, role, e.target.value)}
                        onBlur={() => persist(coverage, role, cell(coverage, role))}
                        className="text-[13px]"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
