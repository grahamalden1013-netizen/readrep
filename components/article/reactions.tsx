"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Lightbulb, MessageSquareDashed, Sparkles } from "lucide-react";
import type { ReactionKind, ReactionTally } from "@/types/ngn";
import { cn } from "@/lib/utils";

const REACTIONS: {
  kind: ReactionKind;
  label: string;
  Icon: typeof Lightbulb;
}[] = [
  { kind: "learned", label: "I learned something", Icon: Lightbulb },
  { kind: "interesting", label: "Interesting", Icon: Sparkles },
  { kind: "agree", label: "Agree", Icon: CircleCheck },
  { kind: "disagree", label: "Disagree", Icon: MessageSquareDashed },
];

/**
 * Reader reactions.
 *
 * There is deliberately no angry reaction, and counts are shown as a quiet
 * tally rather than a leaderboard — the interface is not optimised for
 * engagement.
 */
export function Reactions({
  tally,
  signedIn,
  signInHref,
}: {
  tally: ReactionTally;
  signedIn: boolean;
  signInHref: string;
}) {
  const [counts, setCounts] = useState(tally);
  const [mine, setMine] = useState<ReactionKind[]>([]);

  function toggle(kind: ReactionKind) {
    const active = mine.includes(kind);
    // Agree and disagree are mutually exclusive; the other two are not.
    const opposite: Partial<Record<ReactionKind, ReactionKind>> = {
      agree: "disagree",
      disagree: "agree",
    };

    setMine((prev) => {
      let next = active ? prev.filter((item) => item !== kind) : [...prev, kind];
      const conflict = opposite[kind];
      if (!active && conflict && next.includes(conflict)) {
        next = next.filter((item) => item !== conflict);
      }
      return next;
    });

    setCounts((prev) => {
      const next = { ...prev, [kind]: prev[kind] + (active ? -1 : 1) };
      const conflict = opposite[kind];
      if (!active && conflict && mine.includes(conflict)) {
        next[conflict] = Math.max(0, next[conflict] - 1);
      }
      return next;
    });
  }

  return (
    <section aria-labelledby="reactions" className="rule-top pt-4">
      <h2 id="reactions" className="eyebrow text-ink-3">
        How did this land?
      </h2>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {REACTIONS.map(({ kind, label, Icon }) => {
          const active = mine.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggle(kind)}
              disabled={!signedIn}
              aria-pressed={active}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[0.875rem] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-hairline bg-surface text-ink-2 hover:border-hairline-strong hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="font-mono text-[0.75rem] tabular-nums text-ink-3">
                {counts[kind]}
              </span>
            </button>
          );
        })}
      </div>

      {!signedIn && (
        <p className="mt-3.5 text-[0.8125rem] text-ink-3">
          <Link
            href={signInHref}
            className="font-medium text-accent hover:underline"
          >
            Sign in
          </Link>{" "}
          to react. Reading never requires an account.
        </p>
      )}
    </section>
  );
}
