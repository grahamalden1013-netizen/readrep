"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CircleAlert, Eye, Pencil, TriangleAlert } from "lucide-react";
import { reviewStoryAction } from "@/app/admin/actions";
import { EMPTY_REVIEW, type ReviewState } from "@/app/admin/action-types";
import type { ArticleStatus } from "@/types/ngn";
import type { EditableStory } from "@/lib/admin/editable";
import { Field } from "./field";
import { StoryPreview } from "./story-preview";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIELD_GROUPS: {
  title: string;
  hint: string;
  fields: {
    name: keyof EditableStory;
    label: string;
    rows?: number;
    hint?: string;
    mono?: boolean;
  }[];
}[] = [
  {
    title: "Top of the story",
    hint: "What a reader sees before deciding to read.",
    fields: [
      { name: "headline", label: "Headline", rows: 2 },
      { name: "subheadline", label: "Subheadline", rows: 2 },
      { name: "summary", label: "Summary", rows: 3 },
      {
        name: "inTwentySeconds",
        label: "In 20 seconds",
        rows: 4,
        hint: "The whole story for someone who has never heard of it",
      },
    ],
  },
  {
    title: "The quick version",
    hint: "Three blocks, one idea each.",
    fields: [
      { name: "quickWhatHappened", label: "What happened", rows: 3 },
      { name: "quickWhyItMatters", label: "Why it matters", rows: 3 },
      { name: "quickWhatNext", label: "What happens next", rows: 3 },
    ],
  },
  {
    title: "Body",
    hint: "Use ## for a section heading and - for bullets.",
    fields: [{ name: "body", label: "Article body", rows: 16, mono: true }],
  },
  {
    title: "Understand the sides",
    hint: "Never “Democrats believe”. Write “many Democratic lawmakers argue”.",
    fields: [
      { name: "democraticLabel", label: "Democratic label", rows: 1 },
      { name: "democraticSummary", label: "Democratic summary", rows: 3 },
      {
        name: "democraticPoints",
        label: "Democratic points",
        rows: 4,
        hint: "One per line",
      },
      { name: "republicanLabel", label: "Republican label", rows: 1 },
      { name: "republicanSummary", label: "Republican summary", rows: 3 },
      {
        name: "republicanPoints",
        label: "Republican points",
        rows: 4,
        hint: "One per line",
      },
      {
        name: "otherViews",
        label: "Other perspectives",
        rows: 8,
        mono: true,
        hint: "## Label, then summary, then - points",
      },
    ],
  },
  {
    title: "Evidence",
    hint: "What is established, what is not, and where it came from.",
    fields: [
      { name: "knownFacts", label: "What we know", rows: 6, hint: "One per line" },
      {
        name: "uncertainties",
        label: "What's still unclear",
        rows: 5,
        hint: "One per line",
      },
      {
        name: "keyTerms",
        label: "Key terms",
        rows: 6,
        mono: true,
        hint: "Term — definition",
      },
      {
        name: "sources",
        label: "Sources",
        rows: 6,
        mono: true,
        hint: "Publisher | Title | Date | primary/reporting/analysis/data",
      },
    ],
  },
];

export function StoryEditor({
  initial,
  status,
  editorNotes,
}: {
  initial: EditableStory;
  status: ArticleStatus;
  editorNotes?: string[];
}) {
  const [story, setStory] = useState<EditableStory>(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    reviewStoryAction,
    EMPTY_REVIEW,
  );

  const set = (key: keyof EditableStory) => (value: string) =>
    setStory((prev) => ({ ...prev, [key]: value }));

  return (
    <form action={action}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <p className="text-[0.8125rem] text-ink-3">
            Every field is editable. Nothing publishes without the review
            confirmation.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Editor view"
          className="flex rounded-full border border-hairline p-1"
        >
          {(["edit", "preview"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                tab === value
                  ? "bg-ink text-paper"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {value === "edit" ? (
                <Pencil className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {value === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {editorNotes && editorNotes.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-hairline bg-surface-2 p-5">
          <p className="eyebrow text-ink-3">Notes for the editor</p>
          <ul className="mt-3 space-y-2">
            {editorNotes.map((note) => (
              <li
                key={note}
                className="flex gap-2.5 text-[0.8125rem] leading-[1.6] text-ink-2"
              >
                <TriangleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-ink-3"
                  aria-hidden
                />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fields stay mounted so form data submits from either tab. */}
      <div className={cn("mt-8 space-y-12", tab === "preview" && "hidden")}>
        {FIELD_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="rule-top pt-4">
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
                {group.title}
              </h2>
              <p className="mt-1.5 text-[0.8125rem] text-ink-3">{group.hint}</p>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {group.fields.map((field) => (
                <Field
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  hint={field.hint}
                  rows={field.rows}
                  mono={field.mono}
                  value={story[field.name]}
                  onChange={set(field.name)}
                  className={
                    field.rows && field.rows > 5 ? "lg:col-span-2" : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {tab === "preview" && (
        <div className="mt-8">
          <StoryPreview story={story} />
        </div>
      )}

      <section className="mt-12 rounded-[var(--radius-card)] border border-hairline bg-surface p-6">
        <h2 className="eyebrow text-accent">Publish</h2>
        <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-2">
          AI-assisted drafts must be read by a person before they can be
          approved, scheduled or published. This is enforced, not advisory.
        </p>

        <label className="mt-5 flex items-start gap-3 rounded-xl border border-hairline bg-paper p-4">
          <input
            type="checkbox"
            name="humanReviewed"
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span className="text-[0.875rem] leading-6 text-ink-2">
            I have read every field of this story, checked the facts against the
            sources listed, and confirmed both perspective sections represent
            their positions fairly.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="submit"
            name="intent"
            value="needs_review"
            variant="outline"
            disabled={pending}
          >
            Save as needs review
          </Button>
          <Button
            type="submit"
            name="intent"
            value="approved"
            variant="subtle"
            disabled={pending}
          >
            Approve
          </Button>
          <Button
            type="submit"
            name="intent"
            value="scheduled"
            variant="subtle"
            disabled={pending}
          >
            Schedule
          </Button>
          <Button
            type="submit"
            name="intent"
            value="published"
            variant="accent"
            disabled={pending}
          >
            {pending ? "Checking..." : "Publish"}
          </Button>
        </div>

        {state.status !== "idle" && (
          <div
            role="status"
            className={cn(
              "mt-6 rounded-xl px-4 py-3.5",
              state.status === "ok" ? "bg-accent-soft" : "bg-danger-soft",
            )}
          >
            <p className="flex items-start gap-2.5 text-[0.875rem] leading-6 text-ink">
              {state.status === "ok" ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-accent"
                  aria-hidden
                />
              ) : (
                <CircleAlert
                  className="mt-0.5 size-4 shrink-0 text-danger"
                  aria-hidden
                />
              )}
              {state.message}
            </p>

            {state.issues.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-hairline pt-3">
                {state.issues.map((issue) => (
                  <li
                    key={`${issue.field}-${issue.message}`}
                    className="flex gap-2.5 text-[0.8125rem] leading-[1.6] text-ink-2"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-2 size-1.5 shrink-0 rounded-full",
                        issue.blocking ? "bg-danger" : "bg-ink-3",
                      )}
                    />
                    <span>
                      <span className="font-mono text-[0.75rem] text-ink-3">
                        {issue.field}
                      </span>{" "}
                      — {issue.message}
                      {!issue.blocking && (
                        <span className="text-ink-3"> (warning only)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </form>
  );
}
