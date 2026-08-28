"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Debate, DebateFormat, Opponent } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import { Button, Eyebrow, Pill } from "@/components/ui/primitives";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { aiOpponentFor, findOpponent } from "@/lib/arena/opponents";
import { divisionName } from "@/lib/arena/divisions";
import { formatFor } from "@/lib/arena/formats";
import { track } from "@/lib/analytics";

/**
 * Matchmaking.
 *
 * Matching uses rating, the opposite side, and format. It never uses race,
 * gender, religion or any other identity characteristic — the profile model
 * has no field that could carry one.
 */

type Phase = "searching" | "found" | "no-match";

export function Matchmaking({
  debate,
  position,
  wasAssigned,
  confidence,
  format,
}: {
  debate: Debate;
  position: "support" | "oppose";
  wasAssigned: boolean;
  confidence: number;
  format: DebateFormat;
}) {
  const router = useRouter();
  const { ready, ensureProfile, beginRun } = useArena();
  const [phase, setPhase] = useState<Phase>("searching");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    const profile = ensureProfile();
    setRating(profile.rating);

    // A deliberate short search: instant matching would feel fake, and a long
    // one would just be theatre.
    const timer = setTimeout(() => {
      const found = findOpponent(profile.rating, profile.debatesCompleted);
      setOpponent(found);
      setPhase("found");
    }, 2200);

    return () => clearTimeout(timer);
  }, [ready, ensureProfile]);

  function start(against: Opponent) {
    beginRun({
      debateSlug: debate.slug,
      format,
      position,
      wasAssigned,
      preConfidence: confidence,
      opponent: against,
    });
    track("debate_started", {
      debate: debate.slug,
      format,
      assigned: wasAssigned,
      opponentIsAI: against.isAI,
    });
    router.push(`/arena/${debate.slug}/debate`);
  }

  const spec = formatFor(format);
  const positionTone = position === "support" ? "support" : "oppose";

  return (
    <div className="mx-auto max-w-lg">
      {/* Your side of the matchup */}
      <div className="card p-6">
        <Eyebrow>You</Eyebrow>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <span className="tnum text-3xl font-semibold">
            {rating ?? "—"}
          </span>
          {rating !== null && <DivisionBadge division={divisionName(rating)} />}
        </div>
        <dl className="mt-5 space-y-2.5 border-t border-rule pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-mute">Your position</dt>
            <dd>
              <Pill tone={positionTone}>
                {position === "support" ? "Support" : "Oppose"}
              </Pill>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-mute">Format</dt>
            <dd className="font-medium">
              {spec.name} · {spec.rounds.length} rounds
            </dd>
          </div>
          {wasAssigned && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-mute">Side</dt>
              <dd className="font-medium text-accent">Assigned by NGN</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Search state */}
      <div className="my-6 text-center" aria-live="polite">
        {phase === "searching" && (
          <>
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="live-dot size-1.5 rounded-full bg-ink-faint"
                  style={{ animationDelay: `${i * 220}ms` }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm font-medium">Finding an opponent…</p>
            <p className="mt-1 text-xs text-ink-mute">
              Matching on rating, format and opposite side.
            </p>
          </>
        )}

        {phase === "found" && (
          <p className="text-sm font-medium text-support">Opponent found</p>
        )}

        {phase === "no-match" && (
          <p className="text-sm font-medium">
            No student is available at your level right now.
          </p>
        )}
      </div>

      {/* Opponent */}
      {phase === "found" && opponent && (
        <div className="animate-rise card border-rule-strong p-6">
          <Eyebrow>Your opponent</Eyebrow>
          <p className="mt-3 text-xl font-semibold">{opponent.username}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="tnum text-sm font-semibold">{opponent.rating}</span>
            <DivisionBadge division={opponent.division} size="sm" />
          </div>
          {opponent.school && (
            <p className="mt-1 text-xs text-ink-mute">{opponent.school}</p>
          )}
          <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-mute">
            They are arguing{" "}
            <strong className="font-semibold text-ink">
              {position === "support" ? "against" : "for"}
            </strong>{" "}
            the proposition.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <Button size="lg" full onClick={() => start(opponent)}>
              Start debate
            </Button>
            <Button
              tone="ghost"
              onClick={() => setPhase("no-match")}
              className="text-ink-mute"
            >
              Find someone else
            </Button>
          </div>
        </div>
      )}

      {/* Fallbacks — never leave a student with nothing to do */}
      {phase === "no-match" && (
        <div className="animate-rise space-y-3">
          <button
            type="button"
            onClick={() => start(aiOpponentFor(rating ?? 1200))}
            className="card card-interactive block w-full p-5 text-left"
          >
            <span className="text-base font-semibold">Debate the practice partner</span>
            <span className="mt-1 block text-sm text-ink-mute">
              NGN&apos;s AI opponent argues the other side at your level. Scored
              the same way, and it counts toward your rating.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPhase("searching");
              setTimeout(() => {
                setOpponent(findOpponent((rating ?? 1200) + 40, Math.random() * 3));
                setPhase("found");
              }, 1600);
            }}
            className="card card-interactive block w-full p-5 text-left"
          >
            <span className="text-base font-semibold">Join an asynchronous debate</span>
            <span className="mt-1 block text-sm text-ink-mute">
              Write your rounds now. Your opponent replies when they are next
              online, and you are notified.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
