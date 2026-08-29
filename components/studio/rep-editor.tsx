"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateRepDraft } from "@/lib/reps/validate-draft";

/**
 * Authoring aid, not a CMS. Reps live in `lib/reps/seed.ts` so they are
 * reviewed like code; this validates a draft against the real schema and
 * hands back canonical JSON to paste in.
 */
export function RepEditor({ initialJson }: { initialJson: string }) {
  const [draft, setDraft] = useState(initialJson);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function validate() {
    setCopied(false);
    const result = validateRepDraft(draft);
    if (result.ok) {
      setIssues(null);
      setOutput(result.json);
    } else {
      setOutput(null);
      setIssues(result.issues);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="label-caps text-ink-400">Rep draft (JSON)</span>
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setIssues(null);
            setOutput(null);
          }}
          spellCheck={false}
          rows={22}
          className="rounded-panel border border-ink-600 bg-ink-950 p-3 font-mono text-xs leading-relaxed text-ink-100 focus:border-ink-400"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={validate}>Validate</Button>
        {output ? (
          <Button variant="secondary" onClick={() => void copyOutput()}>
            {copied ? "Copied" : "Copy canonical JSON"}
          </Button>
        ) : null}
      </div>

      {issues ? (
        <ul role="alert" className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li key={issue} className="font-mono text-xs text-signal-bad">
              {issue}
            </li>
          ))}
        </ul>
      ) : null}

      {output ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-signal-good">
            Valid. Paste this into the `rawReps` array in lib/reps/seed.ts.
          </p>
          <pre className="max-h-72 overflow-auto rounded-panel border border-ink-700 bg-ink-950 p-3 font-mono text-xs text-ink-300">
            {output}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
