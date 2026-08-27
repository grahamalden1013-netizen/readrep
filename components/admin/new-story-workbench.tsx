"use client";

import { useActionState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { generateDraftAction } from "@/app/admin/actions";
import { EMPTY_GENERATE, type GenerateState } from "@/app/admin/action-types";
import { StoryEditor } from "./story-editor";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * NEW STORY.
 *
 * Editors enter source material, generate a draft, then edit every field. The
 * generated draft arrives unpublishable by design.
 */
export function NewStoryWorkbench({ aiConnected }: { aiConnected: boolean }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(
    generateDraftAction,
    EMPTY_GENERATE,
  );

  return (
    <div className="space-y-12">
      <form action={action} className="space-y-6">
        <div className="rule-top pt-4">
          <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
            Source material
          </h2>
          <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-5 text-ink-3">
            Everything the draft can assert has to come from here. With no source
            text, a live generation returns uncertainties instead of facts.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="headline">Working headline</Label>
            <Input
              id="headline"
              name="headline"
              placeholder="What the story is about, in one line"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              name="topic"
              placeholder="congress, courts, economy, education..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceUrls">Source URLs</Label>
          <Textarea
            id="sourceUrls"
            name="sourceUrls"
            rows={4}
            placeholder={"One per line\nPrimary documents first"}
            className="font-mono text-[0.8125rem]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceText">Source text</Label>
          <Textarea
            id="sourceText"
            name="sourceText"
            rows={10}
            placeholder="Paste the bill text, opinion, agency rule or reporting the draft must be grounded in."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes for the draft</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Angle, what to avoid, what readers usually misunderstand about this."
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" variant="accent" disabled={pending}>
            <Sparkles className="size-4" />
            {pending ? "Generating..." : "Generate draft"}
          </Button>
          <p className="flex items-center gap-2 text-[0.8125rem] text-ink-3">
            <Bot className="size-3.5" aria-hidden />
            {aiConnected
              ? "Claude connected. Output still requires human approval."
              : "No model connected — returns a structured mock draft."}
          </p>
        </div>

        {state.status === "error" && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[0.875rem] text-ink-2">
            {state.message}
          </p>
        )}
      </form>

      {pending && <GeneratingSkeleton />}

      {state.status === "generated" && state.draft && !pending && (
        <div>
          <div
            className={cn(
              "rounded-[var(--radius-card)] px-4 py-3.5",
              state.live ? "bg-accent-soft" : "bg-surface-2",
            )}
          >
            <p className="text-[0.875rem] leading-6 text-ink-2">
              {state.message}
            </p>
          </div>

          <div className="mt-8">
            <StoryEditor
              initial={state.draft}
              status="ai_generated"
              editorNotes={state.editorNotes}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Generating draft</span>
      <div className="skeleton h-8 w-64 rounded-lg" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-[92%] rounded" />
      <div className="skeleton h-4 w-[85%] rounded" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton h-28 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
