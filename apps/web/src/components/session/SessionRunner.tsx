"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PreRevealMomentDTO, RevealDTO, SessionDTO } from "@/server/dal/player";
import {
  completeSessionAction,
  submitDecisionAction,
  submitReflectionAction,
} from "@/app/(app)/session/[assignmentId]/actions";
import {
  FilmUnavailable,
  GroundingNotice,
  QualityBadge,
  QUALITY_LABEL,
  UncertaintyList,
} from "@/components/ui/primitives";

const COURT_AREA_LABEL: Record<string, string> = {
  left_corner: "Left corner",
  right_corner: "Right corner",
  left_wing: "Left wing",
  right_wing: "Right wing",
  top_of_key: "Top of the key",
  left_elbow: "Left elbow",
  right_elbow: "Right elbow",
  paint: "Paint",
  restricted_area: "Restricted area",
  short_corner: "Short corner",
  backcourt: "Backcourt",
};

const OUTCOME_LABEL: Record<string, string> = {
  made_shot: "Made shot",
  missed_shot: "Missed shot",
  assist: "Assist",
  turnover: "Turnover",
  foul_drawn: "Foul drawn",
  offensive_rebound: "Offensive rebound",
  defensive_stop: "Defensive stop",
  reset: "Possession reset",
  unknown: "Not visible",
};

type Draft =
  | { type: "multiple_choice"; optionId: string }
  | { type: "select_court_area"; area: string }
  | { type: "short_text"; text: string }
  | null;

/**
 * The ReadRep repetition: pause, decide, reveal, learn, reflect.
 *
 * The rule the whole product rests on is enforced by where the data lives, not
 * by discipline in this file. `moment` carries option labels and nothing else —
 * no quality, no rationale, no preferred read. The explanation does not exist on
 * the client until `submitDecisionAction` has stored an attempt and returned it.
 * A player who opens dev tools before answering finds no answer to find.
 */
export function SessionRunner({ session }: { session: SessionDTO }) {
  const router = useRouter();

  /*
   * The queue is snapshotted once, on mount.
   *
   * Deriving it from props each render meant any server-driven refresh — a
   * revalidation, a background router refresh — recomputed the list with the
   * just-answered rep removed, changed the keyed child, and tore down the
   * reveal before the player had read a word of it. A session in progress is
   * not something the server gets to reorder underneath the player.
   */
  const [queue] = useState<PreRevealMomentDTO[]>(() =>
    session.moments.filter((m) => !m.completed),
  );
  const [index, setIndex] = useState(0);
  const moment = queue[index];

  const finish = useCallback(async () => {
    await completeSessionAction(session.assignmentId);
    router.push("/player");
    router.refresh();
  }, [router, session.assignmentId]);

  const advance = useCallback(async () => {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
      return;
    }
    await finish();
  }, [finish, index, queue.length]);

  if (!moment) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Session complete</h1>
        <p className="text-chalk-400 mt-2 text-sm">
          You have worked through every rep in {session.title}.
        </p>
        <button
          type="button"
          onClick={() => void finish()}
          className="bg-court-500 text-ink-950 hover:bg-court-400 mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          Back to sessions
        </button>
      </div>
    );
  }

  const done = session.moments.length - queue.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-chalk-50 truncate text-sm font-medium">{session.title}</p>
          <p className="text-chalk-500 mt-0.5 text-xs">
            Rep {done + index + 1} of {session.moments.length}
          </p>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={session.moments.length}
          aria-valuenow={done + index}
          aria-label="Session progress"
        >
          {session.moments.map((m, i) => (
            <span
              key={m.id}
              className={`h-1 w-7 rounded-full ${
                i < done + index
                  ? "bg-court-500"
                  : i === done + index
                    ? "bg-court-400"
                    : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/*
        Keyed on the moment id so React remounts on every rep. Per-moment state
        resets because the component is new, not because an effect reached in
        and cleared it.
      */}
      <MomentRunner
        key={moment.id}
        assignmentId={session.assignmentId}
        moment={moment}
        isLast={index + 1 >= queue.length}
        onAdvance={advance}
      />
    </div>
  );
}

function MomentRunner({
  assignmentId,
  moment,
  isLast,
  onAdvance,
}: {
  assignmentId: string;
  moment: PreRevealMomentDTO;
  isLast: boolean;
  onAdvance: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(null);
  const [reveal, setReveal] = useState<RevealDTO | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [missedCue, setMissedCue] = useState("");
  const [revisit, setRevisit] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const shownAt = useRef<number>(0);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);

  // Start the decision clock and put focus on the question when the rep opens.
  useEffect(() => {
    shownAt.current = Date.now();
    questionHeading.current?.focus();
  }, []);

  // Move focus to the reveal so a screen-reader user is told the outcome
  // arrived, rather than having to go looking for it.
  useEffect(() => {
    if (reveal) revealHeading.current?.focus();
  }, [reveal]);

  const commit = useCallback(async () => {
    if (!draft || pending) return;
    setPending(true);
    setError(null);
    const result = await submitDecisionAction({
      assignmentId,
      momentId: moment.id,
      response: draft,
      timeToDecideMs: shownAt.current > 0 ? Date.now() - shownAt.current : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReveal(result.reveal);
  }, [assignmentId, draft, moment.id, pending]);

  const saveReflection = useCallback(async () => {
    if (!reveal || reflectionSaved) return;
    const result = await submitReflectionAction({
      attemptId: reveal.attemptId,
      missedCue: missedCue.trim() || null,
      revisit,
    });
    if (result.ok) setReflectionSaved(true);
  }, [missedCue, reflectionSaved, reveal, revisit]);

  /* Keyboard: number keys pick, Enter commits, Enter continues. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" ||
        (target?.tagName === "INPUT" &&
          (target as HTMLInputElement).type !== "checkbox");

      if (reveal) {
        if (event.key === "Enter" && !typing) {
          event.preventDefault();
          void saveReflection().then(onAdvance);
        }
        return;
      }

      if (!typing && /^[1-9]$/.test(event.key)) {
        const position = Number(event.key) - 1;
        if (moment.responseType === "multiple_choice") {
          const option = moment.choices[position];
          if (option) {
            event.preventDefault();
            setDraft({ type: "multiple_choice", optionId: option.id });
          }
        } else if (moment.responseType === "select_court_area") {
          const area = moment.selectableAreas[position];
          if (area) {
            event.preventDefault();
            setDraft({ type: "select_court_area", area });
          }
        }
        return;
      }

      // Enter commits; Ctrl/Cmd+Enter commits from inside the textarea too.
      if (
        event.key === "Enter" &&
        draft &&
        (!typing || event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        void commit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, draft, moment, onAdvance, reveal, saveReflection]);

  const canCommit =
    draft !== null &&
    !pending &&
    !(draft.type === "short_text" && draft.text.trim().length === 0);

  return (
    <>
      <div className="mt-5">
        <FilmUnavailable detail={moment.film.detail} clip={moment.clip} />
      </div>

      {!reveal && (
        <section className="readrep-rise mt-6" aria-labelledby="question-heading">
          <p className="text-court-400 text-xs font-semibold uppercase tracking-[0.08em]">
            Paused — your read
          </p>
          <h1
            id="question-heading"
            ref={questionHeading}
            tabIndex={-1}
            className="mt-2 text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
          >
            {moment.prompt}
          </h1>

          <div className="mt-5">
            {moment.responseType === "multiple_choice" && (
              <fieldset>
                <legend className="sr-only">Choose your read</legend>
                <div className="space-y-2">
                  {moment.choices.map((choice, i) => {
                    const selected =
                      draft?.type === "multiple_choice" && draft.optionId === choice.id;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setDraft({ type: "multiple_choice", optionId: choice.id })
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                          selected
                            ? "border-court-500 bg-court-500/10"
                            : "border-ink-700 bg-ink-850 hover:border-ink-500"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs ${
                            selected
                              ? "border-court-500 bg-court-500 text-ink-950"
                              : "border-ink-600 text-chalk-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-chalk-50 text-sm sm:text-base">
                          {choice.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {moment.responseType === "select_court_area" && (
              <fieldset>
                <legend className="text-chalk-400 mb-3 text-sm">
                  Tap the area you are attacking.
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {moment.selectableAreas.map((area, i) => {
                    const selected =
                      draft?.type === "select_court_area" && draft.area === area;
                    return (
                      <button
                        key={area}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDraft({ type: "select_court_area", area })}
                        className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-4 text-center transition-colors ${
                          selected
                            ? "border-court-500 bg-court-500/10"
                            : "border-ink-700 bg-ink-850 hover:border-ink-500"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="text-chalk-500 font-mono text-[10px]"
                        >
                          {i + 1}
                        </span>
                        <span className="text-chalk-50 text-sm font-medium">
                          {COURT_AREA_LABEL[area] ?? area}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {moment.responseType === "short_text" && (
              <div>
                <label htmlFor="short-answer" className="sr-only">
                  Your answer
                </label>
                <textarea
                  id="short-answer"
                  rows={3}
                  value={draft?.type === "short_text" ? draft.text : ""}
                  onChange={(e) =>
                    setDraft({ type: "short_text", text: e.target.value })
                  }
                  placeholder="Say what you would do, in your own words."
                  className="border-ink-700 bg-ink-850 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 w-full resize-y rounded-xl border px-4 py-3 text-sm focus:outline-none sm:text-base"
                />
                <p className="text-chalk-500 mt-1.5 text-xs">
                  Written answers are not auto-graded. Your coach reads them.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-quality-risk mt-4 text-sm">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-chalk-500 text-xs">
              You have to commit before the play continues.
            </p>
            <button
              type="button"
              onClick={() => void commit()}
              disabled={!canCommit}
              className="bg-court-500 text-ink-950 hover:bg-court-400 disabled:bg-ink-700 disabled:text-chalk-500 rounded-lg px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {pending ? "Locking in…" : "Lock in my read"}
            </button>
          </div>

          {moment.responseType !== "short_text" && (
            <p className="text-chalk-500 mt-6 text-xs">
              Keys <kbd className="text-chalk-200 font-mono">1</kbd>–
              <kbd className="text-chalk-200 font-mono">
                {moment.responseType === "multiple_choice"
                  ? moment.choices.length
                  : moment.selectableAreas.length}
              </kbd>{" "}
              to pick, <kbd className="text-chalk-200 font-mono">Enter</kbd> to lock in.
            </p>
          )}
        </section>
      )}

      {reveal && (
        <section
          className="readrep-rise mt-6 space-y-5"
          aria-labelledby="reveal-heading"
        >
          <div>
            <p className="text-chalk-500 text-xs font-semibold uppercase tracking-[0.08em]">
              Your read
            </p>
            <h2
              id="reveal-heading"
              ref={revealHeading}
              tabIndex={-1}
              className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold tracking-tight"
            >
              {reveal.chosen ? reveal.chosen.label : "Your written answer"}
              <QualityBadge quality={reveal.chosenQuality} />
            </h2>
            {reveal.chosen && (
              <p className="text-chalk-200 mt-2 text-sm leading-relaxed">
                {reveal.chosen.rationale}
              </p>
            )}
            {!reveal.chosen && reveal.chosenQuality === "unclear" && (
              <p className="text-chalk-400 mt-2 text-sm leading-relaxed">
                Written answers are not graded automatically. Your coach will read what
                you wrote.
              </p>
            )}
          </div>

          <div className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5">
            <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
              What was happening
            </p>
            <ul className="mt-2 space-y-1.5">
              {reveal.observedFacts.map((fact, i) => (
                <li key={i} className="text-chalk-200 text-sm leading-relaxed">
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-court-500/30 bg-court-500/5 rounded-xl border p-4 sm:p-5">
            <p className="text-court-400 text-xs font-semibold uppercase tracking-wide">
              The cue
            </p>
            <p className="text-chalk-50 mt-2 text-base font-medium leading-relaxed">
              {reveal.visualCue}
            </p>
          </div>

          <div>
            <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
              Your options
            </p>
            <ul className="mt-2 space-y-2">
              {reveal.allOptions.map((option) => (
                <li
                  key={option.id}
                  className={`rounded-xl border p-4 ${
                    option.id === reveal.preferred.id
                      ? "border-quality-preferred/40 bg-quality-preferred/5"
                      : "border-ink-700 bg-ink-850"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-chalk-50 text-sm font-medium">
                      {option.label}
                    </span>
                    <QualityBadge quality={option.quality} />
                    {reveal.chosen?.id === option.id && (
                      <span className="border-ink-600 bg-ink-800 text-chalk-400 rounded-full border px-2 py-0.5 text-xs">
                        You picked this
                      </span>
                    )}
                  </div>
                  <p className="text-chalk-400 mt-1.5 text-sm leading-relaxed">
                    {option.rationale}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <GroundingNotice grounding={reveal.grounding} rules={reveal.coachRules} />

          <div className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5">
            <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
              What actually happened
            </p>
            <p className="text-chalk-50 mt-2 text-sm">
              {OUTCOME_LABEL[reveal.outcome] ?? reveal.outcome}
            </p>
            {reveal.outcomeNote && (
              <p className="text-chalk-400 mt-1.5 text-sm leading-relaxed">
                {reveal.outcomeNote}
              </p>
            )}
            <p className="border-ink-700 text-chalk-500 mt-3 border-t pt-3 text-xs leading-relaxed">
              The result is recorded separately from the read. A good decision can miss,
              and a poor one can go in.
            </p>
          </div>

          <UncertaintyList items={reveal.uncertainty} />

          <div className="border-ink-700 bg-ink-800 rounded-xl border p-4 sm:p-5">
            <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
              Next time
            </p>
            <p className="text-chalk-50 mt-2 text-base font-medium leading-relaxed">
              {reveal.teachingCue}
            </p>
          </div>

          <div className="border-ink-700 bg-ink-850 rounded-xl border p-4 sm:p-5">
            <label
              htmlFor="missed-cue"
              className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
            >
              What did you miss?
            </label>
            <textarea
              id="missed-cue"
              rows={2}
              value={missedCue}
              onChange={(e) => {
                setMissedCue(e.target.value);
                setReflectionSaved(false);
              }}
              onBlur={() => void saveReflection()}
              placeholder="Optional — in your own words."
              className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-2 w-full resize-y rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
            />
            <label className="text-chalk-200 mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={revisit}
                onChange={(e) => {
                  setRevisit(e.target.checked);
                  setReflectionSaved(false);
                }}
                className="size-4 accent-[var(--color-court-500)]"
              />
              Show me this one again
            </label>
            {reflectionSaved && (
              <p aria-live="polite" className="text-quality-preferred mt-2 text-xs">
                Saved.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-chalk-500 text-xs">
              Press <kbd className="text-chalk-200 font-mono">Enter</kbd> to continue
            </p>
            <button
              type="button"
              onClick={() => void saveReflection().then(onAdvance)}
              className="bg-court-500 text-ink-950 hover:bg-court-400 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
            >
              {isLast ? "Finish session" : "Next rep"}
            </button>
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {reveal
          ? `Revealed. Your read was rated: ${QUALITY_LABEL[reveal.chosenQuality]}.`
          : "Waiting for your decision."}
      </p>
    </>
  );
}
