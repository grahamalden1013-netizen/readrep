"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/panel";
import { COACHING_QUESTIONS } from "@/lib/coaching/profile";
import { saveCoachingSurvey } from "@/lib/actions/coaching";

/**
 * The coaching profile — asked once, edited here, never re-asked per game. Enum
 * answers only. The player never sees any of this; it reaches the analyzer
 * server-side and only for situations it actually applies to.
 */
export function CoachingSurvey({
  initialAnswers,
  redirectTo,
}: {
  initialAnswers: Record<string, string>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const offense = useMemo(() => COACHING_QUESTIONS.filter((q) => q.side === "offense"), []);
  const defense = useMemo(() => COACHING_QUESTIONS.filter((q) => q.side === "defense"), []);
  const answeredCount = COACHING_QUESTIONS.filter((q) => answers[q.id]).length;

  async function save() {
    setSaving(true);
    setError(null);
    setSavedNote(null);
    const result = await saveCoachingSurvey({ answers });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    setSavedNote(result.data.complete ? "Saved. Your profile is complete." : "Saved.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-fg-faint">
          {answeredCount} of {COACHING_QUESTIONS.length} answered
        </p>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round((answeredCount / COACHING_QUESTIONS.length) * 100)}%` }}
          />
        </div>
      </div>

      {[
        { label: "Offense", questions: offense },
        { label: "Defense", questions: defense },
      ].map((group) => (
        <section key={group.label} className="flex flex-col gap-5">
          <SectionLabel>{group.label}</SectionLabel>
          <ol className="flex flex-col gap-6">
            {group.questions.map((q) => (
              <li key={q.id} className="flex flex-col gap-2.5">
                <p className="text-sm font-medium text-fg">{q.prompt}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const active = answers[q.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                        className={`rounded-control border px-3 py-2 text-left text-[0.8125rem] transition-[border-color,background-color] duration-150 ease-signal ${
                          active
                            ? "border-accent bg-raised text-fg"
                            : "border-line-strong bg-surface text-fg-soft hover:border-fg-faint"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}
      {savedNote ? <p className="text-sm text-fg-soft">{savedNote}</p> : null}

      <div className="flex gap-3">
        <Button onClick={() => void save()} disabled={saving} size="lg">
          {saving ? "Saving…" : redirectTo ? "Save and continue" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
