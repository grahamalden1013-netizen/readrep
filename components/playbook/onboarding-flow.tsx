"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { QuestionField, type AnswerValue } from "@/components/playbook/question-field";
import { TerminologyEditor } from "@/components/playbook/terminology-editor";
import { CoverageMatrix } from "@/components/playbook/coverage-matrix";
import { flattenSteps, visibleQuestions, type Answers } from "@/lib/playbook/questions";
import { saveResponse, saveStepProgress, completeOnboarding } from "@/lib/playbook/actions";
import type { PlaybookTerm, CoverageRule } from "@/lib/playbook/queries";
import { cn } from "@/lib/cn";

const EMPTY: AnswerValue = { selections: [], customText: null };

type SaveState = "idle" | "saving" | "saved" | "error";

export function OnboardingFlow({
  teamId,
  teamName,
  initialAnswers,
  initialTerms,
  initialCoverageRules,
  startStepId,
  isEditing,
}: {
  teamId: string;
  teamName: string;
  initialAnswers: Answers;
  initialTerms: PlaybookTerm[];
  initialCoverageRules: CoverageRule[];
  startStepId: string | null;
  isEditing: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();

  // The step list is derived from answers, so conditional sections appear and
  // disappear live as the coach answers.
  const steps = useMemo(() => flattenSteps(answers), [answers]);

  const [stepId, setStepId] = useState<string>(() => {
    const initial = flattenSteps(initialAnswers);
    const found = startStepId && initial.find((s) => s.step.id === startStepId);
    return found ? found.step.id : (initial[0]?.step.id ?? "");
  });

  // Resolve by id so the position stays correct even when branching changes
  // the list length underneath us.
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.step.id === stepId),
  );
  const current = steps[currentIndex];
  const isLast = currentIndex === steps.length - 1;

  const questions = useMemo(
    () => (current ? visibleQuestions(current.step, answers) : []),
    [current, answers],
  );

  // Debounced autosave, one timer per question so a slow save never blocks typing.
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
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  function update(key: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    queueSave(key, value);
  }

  const go = useCallback(
    async (targetIndex: number) => {
      const target = steps[targetIndex];
      if (!target) return;
      setStepId(target.step.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await saveStepProgress(teamId, target.step.id);
    },
    [steps, teamId],
  );

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

  // Keyboard: Enter (or Cmd/Ctrl+Enter inside a textarea) advances.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      const inTextarea = target?.tagName === "TEXTAREA";
      if (inTextarea && !(e.metaKey || e.ctrlKey)) return;
      if (target?.tagName === "BUTTON") return;
      e.preventDefault();
      if (!isLast) void go(currentIndex + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, isLast, go]);

  if (!current) return null;

  const progress = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {current.section.title}
          </p>
          <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-faint-foreground">
            {currentIndex + 1} / {steps.length}
          </p>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${teamName} playbook progress`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section intro only on the section's first step, so it doesn't repeat. */}
      {steps[currentIndex - 1]?.section.slug !== current.section.slug && (
        <div key={current.section.slug} className="rr-animate-in flex flex-col gap-1.5">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-foreground">
            {current.section.title}
          </h1>
          <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">
            {current.section.intro}
          </p>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <div key={current.step.id} className="rr-animate-in flex flex-col gap-8">
        {current.step.kind === "terminology" && (
          <TerminologyEditor teamId={teamId} initialTerms={initialTerms} />
        )}

        {current.step.kind === "coverage" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                {current.step.title}
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {current.step.help}
              </p>
            </div>
            <CoverageMatrix
              teamId={teamId}
              phase={current.step.phase}
              initialRules={initialCoverageRules}
              onDirty={(state, message) => {
                setSaveState(state);
                setError(state === "error" ? (message ?? "Could not save.") : null);
              }}
            />
          </div>
        )}

        {current.step.kind === "questions" &&
          questions.map((q) => (
            <QuestionField
              key={q.key}
              question={q}
              value={answers[q.key] ?? EMPTY}
              onChange={(next) => update(q.key, next)}
            />
          ))}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => go(currentIndex - 1)}
          disabled={currentIndex === 0}
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
          <Button type="button" onClick={() => go(currentIndex + 1)}>
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
