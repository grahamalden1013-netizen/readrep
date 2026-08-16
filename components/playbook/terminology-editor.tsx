"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { addTerm, deleteTerm } from "@/lib/playbook/actions";
import type { PlaybookTerm } from "@/lib/playbook/queries";

const CATEGORIES = [
  "offense",
  "defense",
  "transition",
  "screening",
  "spacing",
  "personnel",
  "other",
] as const;

export function TerminologyEditor({
  teamId,
  initialTerms,
}: {
  teamId: string;
  initialTerms: PlaybookTerm[];
}) {
  const [terms, setTerms] = useState(initialTerms);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [category, setCategory] = useState<string>("offense");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addTerm(teamId, term, meaning, category);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Optimistic local id; the row is re-fetched on any full page load.
      setTerms((prev) => [
        ...prev,
        { id: `pending-${Date.now()}`, term: term.trim(), meaning: meaning.trim(), category },
      ]);
      setTerm("");
      setMeaning("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTerm(teamId, id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setTerms((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {terms.length > 0 && (
        <ul className="flex flex-col gap-2">
          {terms.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13.5px] font-semibold uppercase tracking-wide text-primary">
                    {t.term}
                  </span>
                  <Badge tone="neutral" className="capitalize">
                    {t.category}
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.meaning}</p>
              </div>
              <IconButton
                label={`Remove ${t.term}`}
                size="sm"
                onClick={() => remove(t.id)}
                disabled={pending}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong px-4 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field label="Term">
            {(id) => (
              <Input
                id={id}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. ICE"
              />
            )}
          </Field>
          <Field label="What it means">
            {(id) => (
              <Input
                id={id}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="e.g. Force the ball screen toward the baseline"
              />
            )}
          </Field>
        </div>

        <Field label="Category">
          {(id) => (
            <select
              id={id}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm capitalize text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 sm:max-w-48"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={submit}
          loading={pending}
          className="self-start"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add term
        </Button>
      </div>
    </div>
  );
}
