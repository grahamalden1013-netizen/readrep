"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teachReadRep, resolveRuleChange } from "@/lib/interview/actions";
import { resetInterview } from "@/lib/interview/reset";
import { RESET_PHRASE } from "@/lib/interview/constants";
import type { RuleChange } from "@/lib/interview/types";

/**
 * Everything a coach does with ReadRep's intelligence *after* onboarding:
 * teach it something new, decide on a rule it thinks has changed, or wipe the
 * interview and start again.
 *
 * The Playbook is not a finished survey — it's a model that keeps learning.
 */

export function TeachReadRep({
  teamId,
  ruleChanges,
}: {
  teamId: string;
  ruleChanges: RuleChange[];
}) {
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const message = draft.trim();
    if (!message || isPending) return;
    setError(null);
    setReply(null);
    startTransition(async () => {
      const result = await teachReadRep(teamId, message);
      if (result.ok) {
        setDraft("");
        setReply(result.view.currentQuestion);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
        Teach ReadRep something
      </h2>

      {ruleChanges.map((change) => (
        <RuleChangeCard key={change.id} teamId={teamId} change={change} />
      ))}

      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Changed something, or thought of a rule you never mentioned? Tell ReadRep in a sentence.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="We're icing all side ball screens now."
            aria-label="Teach ReadRep something"
            disabled={isPending}
            className="flex-1"
          />
          <Button onClick={submit} disabled={!draft.trim()} loading={isPending}>
            Teach
          </Button>
        </div>

        {reply && (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {reply}
          </p>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
      </div>
    </section>
  );
}

/**
 * A rule the coach previously confirmed is never silently overwritten. When a
 * new statement would replace one, ReadRep shows both and asks.
 */
function RuleChangeCard({ teamId, change }: { teamId: string; change: RuleChange }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (resolved) return null;

  const decide = (decision: "apply" | "decline") => {
    setError(null);
    startTransition(async () => {
      const result = await resolveRuleChange(teamId, change.id, decision);
      if (result.ok) setResolved(true);
      else setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft px-5 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-warning-soft-foreground">
        Changing something you taught ReadRep
      </p>

      <div className="flex flex-col gap-2 text-[13.5px] leading-relaxed">
        <div>
          <p className="text-[11.5px] uppercase tracking-wide text-warning-soft-foreground opacity-70">
            You previously taught ReadRep
          </p>
          <p className="text-warning-soft-foreground">
            <span className="font-mono text-[11.5px] uppercase opacity-70">
              {change.targetScope}
            </span>{" "}
            {change.targetInstruction}
          </p>
        </div>
        <div>
          <p className="text-[11.5px] uppercase tracking-wide text-warning-soft-foreground opacity-70">
            Change it to
          </p>
          <p className="text-warning-soft-foreground">
            {change.proposedTrigger ? `If ${change.proposedTrigger} → ` : ""}
            {change.proposedInstruction}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide("apply")} loading={isPending}>
          Update rule
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide("decline")} disabled={isPending}>
          Keep existing
        </Button>
      </div>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Start the interview over. Scoped to interview data only — the team, roster,
 * games and questionnaire answers are untouched — and gated behind typing the
 * confirmation phrase.
 */
export function ResetInterview({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <Alert tone="success" title="Interview cleared">
        Everything ReadRep learned from the interview is gone. Your team, players, games and
        questionnaire answers are untouched. Head to the interview to start from zero.
      </Alert>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded px-1 py-0.5 text-[12px] text-faint-foreground transition-colors hover:text-danger"
      >
        <RotateCcw className="size-3" aria-hidden="true" />
        Start the interview over
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-soft px-5 py-4">
      <div>
        <p className="text-[13px] font-medium text-danger-soft-foreground">
          Clear everything ReadRep learned from the interview?
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-danger-soft-foreground opacity-90">
          Removes the conversation, the facts, the open questions and any terminology ReadRep
          picked up. Keeps your team, coaches, players, games and anything you filled in on the
          questionnaire.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={`Type "${RESET_PHRASE}" to confirm`}
          aria-label={`Type ${RESET_PHRASE} to confirm`}
          className="flex-1"
        />
        <Button
          variant="destructive"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await resetInterview(teamId, phrase);
              if (result.ok) setDone(true);
              else setError(result.message);
            });
          }}
          loading={isPending}
        >
          Reset
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
