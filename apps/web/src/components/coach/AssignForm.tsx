"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { AssignContextDTO } from "@/server/dal/review";
import { createAssignmentAction } from "@/app/(app)/coach/review/actions";

/**
 * Turns one approved moment into a player's session.
 *
 * The smallest thing that completes the coach workflow: pick the player, name
 * the session, optionally set a soft due date, create it. Everything it does is
 * re-checked on the server — the eligibility shown here explains the refusal in
 * advance rather than being the refusal.
 */
export function AssignForm({ context }: { context: AssignContextDTO }) {
  const [playerId, setPlayerId] = useState(context.ownerPlayerId);
  const [title, setTitle] = useState(context.suggestedTitle);
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; deduplicated: boolean } | null>(
    null,
  );

  /**
   * Minted on first submit, then reused for every retry of this form.
   *
   * A double-click, a slow connection the coach taps through, or a retried POST
   * all carry the same key, and the data-access layer returns the assignment it
   * already made instead of making a second one. The disabled button below is
   * the courtesy; this is the guarantee.
   *
   * Minted in the handler rather than during render because `randomUUID` is
   * impure, and a value generated during render is not stable across the
   * re-renders React is free to perform.
   */
  const idempotencyKey = useRef<string | null>(null);

  const selected = context.players.find((p) => p.playerId === playerId);
  const canSubmit =
    !pending && title.trim().length > 0 && selected?.mayBeAssigned === true;

  const submit = async () => {
    if (!canSubmit) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setPending(true);
    setError(null);

    const result = await createAssignmentAction({
      teamId: context.teamId,
      playerId,
      title: title.trim(),
      momentIds: [context.momentId],
      // A date input gives a local calendar day; the domain stores instants.
      dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      idempotencyKey: idempotencyKey.current,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCreated({ id: result.assignmentId, deduplicated: result.deduplicated });
  };

  if (created) {
    return (
      <div
        className="readrep-rise border-quality-preferred/40 bg-quality-preferred/5 rounded-xl border p-5"
        role="status"
        data-testid="assign-success"
      >
        <p className="text-quality-preferred text-sm font-semibold">
          {created.deduplicated ? "Already assigned" : "Assigned"}
        </p>
        <p className="text-chalk-200 mt-1.5 text-sm leading-relaxed">
          {created.deduplicated
            ? "This session already existed, so nothing was duplicated."
            : `“${title.trim()}” is now in ${selected?.displayName}'s queue.`}{" "}
          They will see it next time they open ReadRep.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/coach/review"
            className="bg-court-500 text-ink-950 hover:bg-court-400 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Back to the queue
          </Link>
          <Link
            href="/coach"
            className="border-ink-600 text-chalk-200 hover:border-ink-500 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player ------------------------------------------------------------ */}
      <fieldset>
        <legend className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
          Who is this for?
        </legend>
        <div className="mt-2.5 space-y-2">
          {context.players.map((player) => {
            const active = player.playerId === playerId;
            return (
              <button
                key={player.playerId}
                type="button"
                aria-pressed={active}
                disabled={!player.mayBeAssigned}
                onClick={() => setPlayerId(player.playerId)}
                className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? "border-court-500 bg-court-500/10"
                    : "border-ink-700 bg-ink-850 hover:border-ink-500"
                } disabled:border-ink-800 disabled:bg-ink-900 disabled:hover:border-ink-800 disabled:cursor-not-allowed`}
              >
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      player.mayBeAssigned ? "text-chalk-50" : "text-chalk-500"
                    }`}
                  >
                    {player.displayName}
                  </span>
                  <span className="text-chalk-500 mt-0.5 block text-xs">
                    {player.blockedReason ??
                      `${player.momentCount} approved ${
                        player.momentCount === 1 ? "moment" : "moments"
                      }`}
                  </span>
                </span>
                {!player.mayBeAssigned && (
                  <span className="border-ink-700 text-chalk-500 shrink-0 rounded-full border px-2 py-0.5 text-xs">
                    Unavailable
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Title ------------------------------------------------------------- */}
      <div>
        <label
          htmlFor="assignment-title"
          className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
        >
          Session name
        </label>
        <input
          id="assignment-title"
          type="text"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className="border-ink-600 bg-ink-800 text-chalk-50 placeholder:text-chalk-500 focus:border-court-500 mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
        />
        <p className="text-chalk-500 mt-1.5 text-xs">
          What the player sees on their dashboard.
        </p>
      </div>

      {/* Due date ---------------------------------------------------------- */}
      <div>
        <label
          htmlFor="assignment-due"
          className="text-chalk-500 text-xs font-semibold uppercase tracking-wide"
        >
          Due date <span className="text-chalk-500 normal-case">(optional)</span>
        </label>
        <input
          id="assignment-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border-ink-600 bg-ink-800 text-chalk-50 focus:border-court-500 mt-1.5 rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
        />
        <p className="text-chalk-500 mt-1.5 text-xs">
          A nudge, not a deadline. Nothing expires and nothing locks.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-quality-risk text-sm">
          {error}
        </p>
      )}

      <div className="border-ink-700 flex flex-wrap items-center gap-3 border-t pt-5">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          data-testid="assign-submit"
          className="bg-court-500 text-ink-950 hover:bg-court-400 disabled:bg-ink-700 disabled:text-chalk-500 rounded-lg px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {pending ? "Assigning…" : "Create assignment"}
        </button>
        <Link
          href="/coach/review"
          className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
