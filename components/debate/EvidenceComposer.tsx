"use client";

import { useState } from "react";
import type { EvidenceItem } from "@/types/ngn";
import { analyzeSource } from "@/app/actions/arena";
import { Button, Pill } from "@/components/ui/primitives";

/**
 * Evidence attachment.
 *
 * A link is never treated as proof. The assessment shown next to each chip
 * classifies what KIND of source it is and reminds the student they still have
 * to explain why it supports their claim.
 */

export function EvidenceChip({
  item,
  onRemove,
}: {
  item: EvidenceItem;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-sm border border-rule-strong bg-paper-sunken px-2.5 py-1.5">
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{item.publisher}</span>
        <span className="block truncate text-[0.6875rem] text-ink-mute">
          {item.title || item.url}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove evidence from ${item.publisher}`}
          className="shrink-0 text-ink-faint hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}

export function EvidenceComposer({
  evidence,
  onChange,
}: {
  evidence: EvidenceItem[];
  onChange: (next: EvidenceItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [assessment, setAssessment] = useState<{
    publisher: string;
    sourceType: string;
    note: string;
    valid: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  async function check(value: string) {
    setUrl(value);
    if (value.length < 6) {
      setAssessment(null);
      return;
    }
    setChecking(true);
    try {
      setAssessment(await analyzeSource(value));
    } catch {
      setAssessment(null);
    } finally {
      setChecking(false);
    }
  }

  function add() {
    if (!url.trim() || !assessment?.valid) return;
    onChange([
      ...evidence,
      {
        id: `ev-${Date.now()}`,
        url: url.trim(),
        title: title.trim(),
        publisher: assessment.publisher,
        quote: quote.trim(),
        note: note.trim(),
      },
    ]);
    setUrl("");
    setTitle("");
    setQuote("");
    setNote("");
    setAssessment(null);
    setOpen(false);
  }

  return (
    <div>
      {evidence.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {evidence.map((item, index) => (
            <li key={item.id} className="max-w-full">
              <EvidenceChip
                item={item}
                onRemove={() =>
                  onChange(evidence.filter((_, i) => i !== index))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          <span aria-hidden>+</span> Add evidence
        </button>
      ) : (
        <div className="animate-rise rounded-sm border border-rule bg-paper-raised p-4">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Source URL</span>
              <input
                type="url"
                value={url}
                onChange={(e) => check(e.target.value)}
                placeholder="https://www.census.gov/…"
                className="mt-1 h-10 w-full rounded-sm border border-rule bg-paper px-3 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
              />
            </label>

            {checking && (
              <p className="text-xs text-ink-faint">Checking source…</p>
            )}

            {assessment && !checking && (
              <div
                className={`rounded-sm border p-3 ${
                  assessment.valid
                    ? "border-rule bg-paper-sunken"
                    : "border-oppose/30 bg-oppose-soft"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">{assessment.publisher}</span>
                  {assessment.valid && <Pill>{assessment.sourceType}</Pill>}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mute">
                  {assessment.note}
                </p>
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Title (optional)</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-10 w-full rounded-sm border border-rule bg-paper px-3 text-sm focus:border-ink focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                Quote or figure you are relying on
              </span>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-sm border border-rule bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-ink-soft">
                Why does this support your claim?
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="A link on its own is not evidence. Say what it shows."
                className="mt-1 w-full resize-none rounded-sm border border-rule bg-paper px-3 py-2 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={add} disabled={!assessment?.valid}>
              Attach
            </Button>
            <Button size="sm" tone="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
