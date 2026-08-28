"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Debate, EvidenceItem, RoundEntry } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import { Button, EmptyState, ButtonLink, Pill } from "@/components/ui/primitives";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { EvidenceChip, EvidenceComposer } from "./EvidenceComposer";
import { RoundTimer } from "./RoundTimer";
import { ReportButton } from "./ReportButton";
import { roundsFor } from "@/lib/arena/formats";
import { opponentLine, opponentThinkingTime } from "@/lib/arena/opponents";
import { divisionName } from "@/lib/arena/divisions";
import { scoreDebate, moderateText } from "@/app/actions/arena";
import { track } from "@/lib/analytics";

/**
 * The structured debate interface.
 *
 * The state machine that matters: writing → submitted → opponent submitted →
 * revealed. A student never sees their opponent's response for the current
 * round before submitting their own, which is what makes the exchange a debate
 * rather than a comment thread.
 */

type Phase =
  | "writing"
  | "submitting"
  | "waiting"
  | "revealed"
  | "scoring"
  | "blocked";

export function DebateRoom({ debate }: { debate: Debate }) {
  const router = useRouter();
  const { ready, profile, activeRun, submitRound, finishRun, abandonRun } = useArena();

  const [draft, setDraft] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [phase, setPhase] = useState<Phase>("writing");
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const rounds = useMemo(
    () => roundsFor(activeRun?.format ?? debate.format),
    [activeRun?.format, debate.format],
  );

  const roundIndex = activeRun?.rounds.length ?? 0;
  const spec = rounds[Math.min(roundIndex, rounds.length - 1)];
  const isFinalRound = roundIndex === rounds.length - 1;
  const complete = activeRun ? activeRun.rounds.length >= rounds.length : false;

  const opponentPosition =
    activeRun?.position === "support" ? "oppose" : "support";

  // Reset the composer when a new round opens. Done during render rather than
  // in an effect so the previous round's text never flashes in the new round.
  const [composerRound, setComposerRound] = useState(roundIndex);
  if (composerRound !== roundIndex && phase === "revealed") {
    setComposerRound(roundIndex);
    setDraft("");
    setEvidence([]);
    setBlockReason(null);
  }

  // Once every round is written, score the debate and move to results.
  const runScoring = useCallback(async () => {
    if (!activeRun) return;
    setPhase("scoring");
    try {
      const result = await scoreDebate({
        debateSlug: debate.slug,
        position: activeRun.position,
        rounds: activeRun.rounds,
        evidence: activeRun.rounds.flatMap((r) => r.evidence),
      });
      finishRun({ userScore: result.user, opponentScore: result.opponent });
      track("debate_completed", {
        debate: debate.slug,
        score: result.user.overall,
        aiBacked: result.aiBacked,
      });
      router.push(`/arena/${debate.slug}/results`);
    } catch {
      setPhase("revealed");
      setBlockReason(
        "Scoring could not be completed. Your responses are saved — try again.",
      );
    }
  }, [activeRun, debate.slug, finishRun, router]);

  async function submit() {
    if (!activeRun || draft.trim().length < 20) return;

    setPhase("submitting");

    // Moderation runs before anything is stored or revealed.
    const verdict = await moderateText(draft);
    if (verdict.severity === "block") {
      setPhase("blocked");
      setBlockReason(
        "This response was held by moderation. Argue against the position, not the person, and remove any personal contact details.",
      );
      return;
    }

    const line = opponentLine(
      debate,
      opponentPosition,
      spec.type,
      (activeRun.opponent.rating + roundIndex) % 7,
    );

    setPhase("waiting");

    // The opponent "writes" for a moment, so the reveal lands as a reveal.
    setTimeout(() => {
      submitRound({
        roundIndex,
        type: spec.type,
        userText: draft.trim(),
        opponentText: line,
        evidence,
      });
      setPhase("revealed");
    }, opponentThinkingTime(activeRun.format));
  }

  /* --- Guards ---------------------------------------------------------- */

  if (!ready) {
    return (
      <div className="py-20 text-center text-sm text-ink-mute">Loading your debate…</div>
    );
  }

  if (!activeRun || activeRun.debateSlug !== debate.slug) {
    return (
      <EmptyState
        title="Your first debate starts here."
        body="You have not entered this debate yet. Read the briefing, choose a position, and NGN will find you an opponent."
        action={
          <ButtonLink href={`/arena/${debate.slug}/brief`}>
            Read the briefing
          </ButtonLink>
        }
      />
    );
  }

  if (complete && phase !== "scoring") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-2xl">All rounds complete</h2>
        <p className="mt-2 text-sm text-ink-mute">
          Send the transcript to the judge to see how your argument scored.
        </p>
        <Button size="lg" className="mt-6" onClick={runScoring}>
          Get your score
        </Button>
      </div>
    );
  }

  const charCount = draft.length;
  const overLimit = charCount > spec.maxCharacters;
  const tooShort = draft.trim().length < 20;
  const positionTone = activeRun.position === "support" ? "support" : "oppose";

  return (
    <div>
      {/* --- Header ------------------------------------------------------ */}
      <header className="sticky top-14 z-30 -mx-4 mb-6 border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur-md sm:top-16 sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{debate.title}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-mute">
              <span className="tnum">
                Round {roundIndex + 1} of {rounds.length}
              </span>
              <span aria-hidden>·</span>
              <span>{spec.label}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <RoundTimer
              seconds={spec.timeLimitSeconds}
              running={phase === "writing"}
            />
            <ReportButton context="debate" />
          </div>

          <ol
            aria-label="Round progress"
            className="flex w-full items-center gap-1"
          >
            {rounds.map((round, index) => (
              <li
                key={round.index}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    index < roundIndex
                      ? "var(--color-lime-deep)"
                      : index === roundIndex
                        ? "var(--color-ink)"
                        : "var(--color-paper-sunken)",
                }}
              >
                <span className="sr-only">
                  {round.label}: {index < roundIndex ? "complete" : index === roundIndex ? "current" : "upcoming"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* --- Arena layout ------------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,200px)] lg:gap-8">
        {/* Left: you */}
        <aside className="order-1 lg:order-none">
          <CompetitorCard
            name={profile?.username ?? "You"}
            rating={profile?.rating ?? 1200}
            position={activeRun.position}
            assigned={activeRun.wasAssigned}
            isYou
          />
        </aside>

        {/* Centre: rounds */}
        <div className="order-3 min-w-0 lg:order-none">
          {/* Completed rounds */}
          {activeRun.rounds.length > 0 && (
            <ol className="mb-8 space-y-8">
              {activeRun.rounds.map((round) => (
                <RoundExchange
                  key={round.roundIndex}
                  entry={round}
                  label={rounds[round.roundIndex]?.label ?? "Round"}
                  yourName={profile?.username ?? "You"}
                  opponentName={activeRun.opponent.username}
                  yourPosition={activeRun.position}
                />
              ))}
            </ol>
          )}

          {/* Current round */}
          {phase === "revealed" && !complete ? (
            <div className="animate-rise text-center">
              <p className="text-sm text-ink-mute">
                Both arguments are in. Next up: {rounds[roundIndex]?.label}.
              </p>
              <Button className="mt-4" onClick={() => setPhase("writing")}>
                Continue to {rounds[roundIndex]?.label}
              </Button>
            </div>
          ) : phase === "waiting" ? (
            <div className="card animate-rise p-8 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="live-dot size-1.5 rounded-full bg-ink-faint"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm font-medium">
                {activeRun.opponent.username} is writing…
              </p>
              <p className="mt-1 text-xs text-ink-mute">
                Neither argument is revealed until both are submitted.
              </p>
            </div>
          ) : phase === "scoring" ? (
            <div className="card p-8 text-center">
              <p className="text-sm font-medium">Scoring your argument…</p>
              <p className="mt-1 text-xs text-ink-mute">
                Evidence, reasoning, rebuttal, clarity, understanding, civility.
              </p>
            </div>
          ) : (
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg">
                  Round {roundIndex + 1} — {spec.label}
                </h2>
                <Pill tone={positionTone}>
                  Arguing {activeRun.position === "support" ? "Support" : "Oppose"}
                </Pill>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                {spec.prompt}
              </p>

              <label className="mt-5 block">
                <span className="sr-only">Your {spec.label}</span>
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={phase === "submitting"}
                  rows={9}
                  placeholder={
                    spec.type === "opening"
                      ? "State your claim. Give your reason. Back it with evidence."
                      : spec.type === "closing"
                        ? "Summarise your strongest case and why your reasoning held up."
                        : "Name the specific claim you are answering, then answer it."
                  }
                  className={`w-full resize-y rounded-sm border bg-paper px-4 py-3 text-[0.9375rem] leading-relaxed placeholder:text-ink-faint focus:outline-none ${
                    overLimit ? "border-live" : "border-rule focus:border-ink"
                  }`}
                />
              </label>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`tnum text-xs ${overLimit ? "font-semibold text-live" : "text-ink-faint"}`}
                >
                  {charCount} / {spec.maxCharacters}
                </span>
                <span className="text-xs text-ink-faint">
                  Auto-saved as you type
                </span>
              </div>

              <div className="mt-5 border-t border-rule pt-4">
                <EvidenceComposer evidence={evidence} onChange={setEvidence} />
              </div>

              {blockReason && (
                <p
                  role="alert"
                  className="mt-4 rounded-sm border border-oppose/30 bg-oppose-soft px-3 py-2.5 text-sm text-oppose"
                >
                  {blockReason}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={submit}
                  disabled={tooShort || overLimit || phase === "submitting"}
                >
                  {phase === "submitting"
                    ? "Checking…"
                    : isFinalRound
                      ? "Submit closing argument"
                      : `Submit ${spec.label.toLowerCase()}`}
                </Button>
                <span className="text-xs text-ink-faint">
                  {tooShort
                    ? "Write at least a couple of sentences."
                    : "Your opponent cannot see this until they have submitted too."}
                </span>
              </div>
            </section>
          )}

          {/* Leave */}
          <div className="mt-8 border-t border-rule pt-5 text-center">
            <button
              type="button"
              onClick={() => {
                abandonRun();
                router.push("/arena");
              }}
              className="text-xs text-ink-faint underline-offset-4 hover:text-ink hover:underline"
            >
              Leave this debate — your rating is not affected
            </button>
          </div>
        </div>

        {/* Right: opponent */}
        <aside className="order-2 lg:order-none">
          <CompetitorCard
            name={activeRun.opponent.username}
            rating={activeRun.opponent.rating}
            position={opponentPosition}
            school={activeRun.opponent.school}
            isAI={activeRun.opponent.isAI}
          />
          {phase === "waiting" && (
            <p className="mt-3 text-center text-xs text-ink-faint lg:text-left">
              Writing…
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CompetitorCard({
  name,
  rating,
  position,
  school,
  isYou,
  isAI,
  assigned,
}: {
  name: string;
  rating: number;
  position: "support" | "oppose";
  school?: string;
  isYou?: boolean;
  isAI?: boolean;
  assigned?: boolean;
}) {
  const tone = position === "support" ? "support" : "oppose";
  const color = position === "support" ? "var(--color-support)" : "var(--color-oppose)";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow text-ink-mute">{isYou ? "You" : "Opponent"}</span>
        {isAI && <Pill>Practice AI</Pill>}
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{name}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="tnum text-sm font-semibold">{rating}</span>
        <DivisionBadge division={divisionName(rating)} size="sm" />
      </div>
      {school && <p className="mt-1 truncate text-xs text-ink-mute">{school}</p>}

      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <Pill tone={tone}>{position === "support" ? "Support" : "Oppose"}</Pill>
        {assigned && (
          <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-faint">
            Assigned side — not necessarily your own view.
          </p>
        )}
      </div>
      <span aria-hidden className="mt-3 block h-0.5 w-8" style={{ backgroundColor: color }} />
    </div>
  );
}

function RoundExchange({
  entry,
  label,
  yourName,
  opponentName,
  yourPosition,
}: {
  entry: RoundEntry;
  label: string;
  yourName: string;
  opponentName: string;
  yourPosition: "support" | "oppose";
}) {
  return (
    <li className="animate-rise">
      <div className="mb-4 flex items-center gap-3">
        <span className="eyebrow text-ink-mute">
          Round {entry.roundIndex + 1} — {label}
        </span>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>

      <div className="space-y-4">
        <Argument
          author={yourName}
          body={entry.userText}
          position={yourPosition}
          evidence={entry.evidence}
          isYou
        />
        <Argument
          author={opponentName}
          body={entry.opponentText}
          position={yourPosition === "support" ? "oppose" : "support"}
          evidence={[]}
        />
      </div>
    </li>
  );
}

function Argument({
  author,
  body,
  position,
  evidence,
  isYou,
}: {
  author: string;
  body: string;
  position: "support" | "oppose";
  evidence: EvidenceItem[];
  isYou?: boolean;
}) {
  const color = position === "support" ? "var(--color-support)" : "var(--color-oppose)";

  return (
    <article
      className={`rounded-sm border-l-2 bg-paper-raised p-4 sm:p-5 ${isYou ? "" : "bg-paper-sunken/50"}`}
      style={{ borderColor: color }}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{author}</span>
        <span
          className="text-[0.6875rem] font-medium uppercase tracking-[0.1em]"
          style={{ color }}
        >
          {position === "support" ? "Support" : "Oppose"}
        </span>
      </header>
      <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
        {body}
      </p>
      {evidence.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-3">
          {evidence.map((item) => (
            <li key={item.id}>
              <EvidenceChip item={item} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
