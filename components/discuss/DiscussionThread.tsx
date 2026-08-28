"use client";

import { useState } from "react";
import type { Discussion } from "@/types/ngn";
import { Button, Card, Pill } from "@/components/ui/primitives";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { ReportButton } from "@/components/debate/ReportButton";
import { moderateText } from "@/app/actions/arena";
import { DISCUSSION_PLEDGE } from "@/data/demo/discussions";

/**
 * Discussion is the slow room — deliberately not the Arena.
 *
 * There is exactly one reaction, "Made me think", and no downvote, no ratio, no
 * reply-count ranking. Every reaction available here rewards changing someone's
 * mind rather than confirming a crowd's.
 */
export function DiscussionThread({ discussion }: { discussion: Discussion }) {
  const [draft, setDraft] = useState("");
  const [posted, setPosted] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [thanked, setThanked] = useState<Set<string>>(new Set());

  async function post() {
    if (draft.trim().length < 30) return;
    setSubmitting(true);
    setWarning(null);

    const verdict = await moderateText(draft);
    if (verdict.severity === "block") {
      setWarning(
        "This response was held. Challenge the idea, not the person, and remove any personal contact details.",
      );
      setSubmitting(false);
      return;
    }

    setPosted((prev) => [draft.trim(), ...prev]);
    setDraft("");
    setSubmitting(false);
  }

  function toggleThanks(id: string) {
    setThanked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-10">
      {/* Composer */}
      <section>
        <div className="rounded-sm border border-lime-deep bg-accent-soft px-4 py-3">
          <p className="text-sm font-medium">{DISCUSSION_PLEDGE}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            This is not the Arena. Nobody is scored here and nothing is a
            contest — take your time and say the thing you are actually unsure
            about.
          </p>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Your response</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="What do you actually think, and what made you think it?"
            className="w-full resize-y rounded-sm border border-rule bg-paper px-4 py-3 text-[0.9375rem] leading-relaxed placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>

        {warning && (
          <p role="alert" className="mt-3 rounded-sm border border-oppose/30 bg-oppose-soft px-3 py-2.5 text-sm text-oppose">
            {warning}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={post} disabled={draft.trim().length < 30 || submitting}>
            {submitting ? "Checking…" : "Post response"}
          </Button>
          <span className="text-xs text-ink-faint">
            Reviewed before it appears. No likes, no downvotes, no ratios.
          </span>
        </div>
      </section>

      {/* Responses */}
      <section>
        <div className="section-rule mb-6">
          <h2 className="text-xl">
            Responses{" "}
            <span className="tnum text-base text-ink-faint">
              {discussion.responses.length + posted.length}
            </span>
          </h2>
        </div>

        <ul className="space-y-4">
          {posted.map((body, index) => (
            <li key={`own-${index}`}>
              <Card className="border-lime-deep p-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">You</span>
                  <Pill tone="accent">Pending review</Pill>
                </div>
                <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
                  {body}
                </p>
              </Card>
            </li>
          ))}

          {discussion.responses.map((response) => (
            <li key={response.id}>
              <Card className="p-5">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold">{response.author}</span>
                  <DivisionBadge division={response.division} size="sm" />
                  <span className="ml-auto text-xs text-ink-faint">
                    {response.postedAt}
                  </span>
                </header>

                <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
                  {response.body}
                </p>

                <footer className="mt-4 flex items-center gap-4 border-t border-rule pt-3">
                  <button
                    type="button"
                    onClick={() => toggleThanks(response.id)}
                    aria-pressed={thanked.has(response.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      thanked.has(response.id)
                        ? "border-lime-deep bg-accent-soft text-accent"
                        : "border-rule text-ink-mute hover:border-rule-strong hover:text-ink"
                    }`}
                  >
                    Made me think
                    <span className="tnum">
                      {response.madeMeThink + (thanked.has(response.id) ? 1 : 0)}
                    </span>
                  </button>
                  <ReportButton context="response" />
                </footer>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
