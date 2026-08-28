"use client";

import { useMemo, useState } from "react";
import type { Category, Debate, DebateFormat, Difficulty } from "@/types/ngn";
import { CATEGORIES, DIFFICULTIES } from "@/types/ngn";
import { DebateCard } from "./DebateCard";
import { EmptyState, ButtonLink } from "@/components/ui/primitives";
import { FORMAT_LIST } from "@/lib/arena/formats";

/**
 * Filterable debate browser.
 *
 * Filters are client state rather than URL state on purpose: a student
 * narrowing by category mid-session should not push a dozen history entries
 * between them and the back button.
 */

const STATUS_TABS = [
  { id: "live", label: "Live" },
  { id: "ongoing", label: "Ongoing" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["id"];

const TIME_FILTERS = [
  { id: "any", label: "Any length" },
  { id: "short", label: "Under 15 min" },
  { id: "long", label: "30 min +" },
] as const;

type TimeFilter = (typeof TIME_FILTERS)[number]["id"];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-ink-inverse"
          : "border-rule-strong bg-paper-raised text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function ArenaBrowser({ debates }: { debates: Debate[] }) {
  const [status, setStatus] = useState<StatusTab>("live");
  const [category, setCategory] = useState<Category | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [format, setFormat] = useState<DebateFormat | "all">("all");
  const [time, setTime] = useState<TimeFilter>("any");

  const filtered = useMemo(() => {
    return debates.filter((debate) => {
      if (debate.status !== status) return false;
      if (category !== "all" && debate.category !== category) return false;
      if (difficulty !== "all" && debate.difficulty !== difficulty) return false;
      if (format !== "all" && debate.format !== format) return false;
      if (time === "short" && debate.estimatedMinutes >= 15) return false;
      if (time === "long" && debate.estimatedMinutes < 30) return false;
      return true;
    });
  }, [debates, status, category, difficulty, format, time]);

  const counts = useMemo(() => {
    const out = {} as Record<StatusTab, number>;
    for (const tab of STATUS_TABS) {
      out[tab.id] = debates.filter((d) => d.status === tab.id).length;
    }
    return out;
  }, [debates]);

  const anyFilterActive =
    category !== "all" || difficulty !== "all" || format !== "all" || time !== "any";

  return (
    <div>
      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Debate status"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={status === tab.id}
            onClick={() => setStatus(tab.id)}
            className={`relative shrink-0 px-3 py-3 text-sm font-medium transition-colors ${
              status === tab.id ? "text-ink" : "text-ink-mute hover:text-ink"
            }`}
          >
            {tab.label}
            <span className="tnum ml-1.5 text-xs text-ink-faint">
              {counts[tab.id]}
            </span>
            {status === tab.id && (
              <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] bg-lime-deep" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3 py-5">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d}
              active={difficulty === d}
              onClick={() => setDifficulty(difficulty === d ? "all" : d)}
            >
              {d}
            </Chip>
          ))}
          <span aria-hidden className="mx-1 hidden w-px shrink-0 bg-rule sm:block" />
          {FORMAT_LIST.map((f) => (
            <Chip
              key={f.id}
              active={format === f.id}
              onClick={() => setFormat(format === f.id ? "all" : f.id)}
            >
              {f.name}
            </Chip>
          ))}
          <span aria-hidden className="mx-1 hidden w-px shrink-0 bg-rule sm:block" />
          {TIME_FILTERS.filter((t) => t.id !== "any").map((t) => (
            <Chip
              key={t.id}
              active={time === t.id}
              onClick={() => setTime(time === t.id ? "any" : t.id)}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        {anyFilterActive && (
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setDifficulty("all");
              setFormat("all");
              setTime("any");
            }}
            className="text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      <p aria-live="polite" className="sr-only">
        {filtered.length} debates match your filters.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            status === "upcoming"
              ? "New Arena matchups are being prepared."
              : "Nothing matches those filters yet."
          }
          body={
            anyFilterActive
              ? "Try widening the category or format, or check another tab."
              : "Debates open on a rolling schedule. Check the Live tab, or read a briefing while you wait."
          }
          action={<ButtonLink href="/today" tone="secondary">Read Today&apos;s Brief</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((debate) => (
            <li key={debate.id} className="relative">
              <DebateCard debate={debate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
