"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { QuestionField, type AnswerValue } from "@/components/playbook/question-field";
import { TerminologyEditor } from "@/components/playbook/terminology-editor";
import {
  visibleSections,
  visibleQuestions,
  type Answers,
} from "@/lib/playbook/questions";
import { saveResponse, saveSectionProgress, completeOnboarding } from "@/lib/playbook/actions";
import type { PlaybookTerm } from "@/lib/playbook/queries";
import { cn } from "@/lib/cn";

const EMPTY: AnswerValue = { selections: [], customText: null };

type SaveState = "idle" | "saving" | "saved" | "error";

export function OnboardingFlow({
  teamId,
  teamName,
  initialAnswers,
  initialTerms,
  startSection,
  isEditing,
}: {
  teamId: string;
  teamName: string;
  initialAnswers: Answers;
  initialTerms: PlaybookTerm[];
  startSection: string | null;
  isEditing: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();

  // Sections are recomputed from answers, so conditional sections appear and
  // disappear as the coach answers — e.g. the P&R section only exists once
  // they say they run ball screens.
  const sections = useMemo(() => visibleSections(answers), [answers]);

  const [index, setIndex] = useState(() => {
    if (!startSection) return 0;
    const found = visibleSections(initialAnswers).findIndex((s) => s.slug === startSection);
    return found >= 0 ? found : 0;
  });

  const safeIndex = Math.min(index, sections.length - 1);
  const section = sections[safeIndex];
  const questions = useMemo(
    () => (section ? visibleQuestions(section, answers) : []),
    [section, answers],
  );

  const isLast = safeIndex === sections.length - 1;

  // Debounced autosave. Each question saves independently so a slow network
  // never blocks typing, and leaving mid-section keeps whatever was entered.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const queueSave = useCallback(
    (key: string, value: AnswerValue) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);

      setSaveState("saving");
      const timer = setTimeout(async () => {
        const result = await saveResponse(teamId, key, value.selections, value.customText);
        if (result.ok) {
          setSaveState("saved");
          setError(null);
        } else {
          setSaveState("error");
          setError(result.message);
        }
      }, 600);

      timers.current.set(key, timer);
    },
    [teamId],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
    };
  }, []);

  function update(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    queueSave(key, value);
  }

  async function goTo(nextIndex: number) {
    const target = sections[nextIndex];
    if (!target) return;
    setIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await saveSectionProgress(teamId, target.slug);
  }

  function finish() {
    startFinishing(async () => {
      const result = await completeOnboarding(teamId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/coach/playbook");
      router.refresh();
    });
  }

  if (!section) return null;

  const progress = Math.round(((safeIndex + 1) / sections.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      {/* Progress */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {teamName}
          </p>
          <p className="font-mono text-[11.5px] tabular-nums text-faint-foreground">
            Step {safeIndex + 1} of {sections.length}
          </p>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section heading */}
      <div key={section.slug} className="rr-animate-in flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {section.title}
        </h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">
          {section.intro}
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Questions */}
      <div key={`${section.slug}-body`} className="rr-animate-in rr-delay-1 flex flex-col gap-9">
        {section.slug === "terminology" ? (
          <TerminologyEditor teamId={teamId} initialTerms={initialTerms} />
        ) : (
          questions.map((q) => (
            <QuestionField
              key={q.key}
              question={q}
              value={answers[q.key] ?? EMPTY}
              onChange={(next) => update(q.key, next)}
            />
          ))
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => goTo(safeIndex - 1)}
          disabled={safeIndex === 0}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>

        <span
          className={cn(
            "flex items-center gap-1.5 text-[12px] transition-opacity duration-[var(--duration-base)]",
            saveState === "idle" ? "opacity-0" : "opacity-100",
            saveState === "error" ? "text-danger" : "text-faint-foreground",
          )}
          aria-live="polite"
        >
          {saveState === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Saving
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-3" aria-hidden="true" />
              Saved
            </>
          )}
          {saveState === "error" && "Not saved"}
        </span>

        {isLast ? (
          <Button type="button" onClick={finish} loading={finishing}>
            {isEditing ? "Save playbook" : "Finish"}
          </Button>
        ) : (
          <Button type="button" onClick={() => goTo(safeIndex + 1)}>
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
