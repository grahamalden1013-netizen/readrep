"use client";

import { useState } from "react";
import type { ArticleDraft } from "@/lib/ai/articleGenerator";
import {
  Button,
  Card,
  Eyebrow,
  Pill,
  SectionHead,
  Stat,
} from "@/components/ui/primitives";
import { draftBriefing } from "@/app/actions/admin";
import { DEBATES } from "@/data/demo/debates";
import { ARTICLES } from "@/data/demo/articles";
import { ISSUES } from "@/data/demo/issues";
import { MODERATION_QUEUE } from "@/data/demo/classroom";
import { ALL_SOURCES } from "@/data/demo/sources";
import { TOURNAMENT } from "@/data/demo/community";

const SECTIONS = [
  "Dashboard",
  "Newsroom",
  "Debates",
  "Sources",
  "Moderation",
  "Issues",
  "Weekly",
  "Tournaments",
] as const;

type Section = (typeof SECTIONS)[number];

export function AdminConsole() {
  const [section, setSection] = useState<Section>("Dashboard");

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr] lg:gap-12">
      <nav aria-label="Admin sections">
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0">
          {SECTIONS.map((item) => (
            <li key={item} className="shrink-0">
              <button
                type="button"
                onClick={() => setSection(item)}
                aria-current={section === item ? "page" : undefined}
                className={`w-full rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors ${
                  section === item
                    ? "bg-ink text-ink-inverse"
                    : "text-ink-mute hover:bg-paper-sunken hover:text-ink"
                }`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        {section === "Dashboard" && <Dashboard />}
        {section === "Newsroom" && <Newsroom />}
        {section === "Debates" && <DebatesAdmin />}
        {section === "Sources" && <SourcesAdmin />}
        {section === "Moderation" && <ModerationAdmin />}
        {section === "Issues" && <SimpleList title="Issues" items={ISSUES.map((i) => i.title)} />}
        {section === "Weekly" && (
          <SimpleList
            title="NGN Weekly"
            items={ARTICLES.filter((a) => a.kind === "weekly").map((a) => a.headline)}
          />
        )}
        {section === "Tournaments" && (
          <SimpleList
            title="Tournaments"
            items={[`${TOURNAMENT.name} — ${TOURNAMENT.status}`]}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Dashboard() {
  const pending = MODERATION_QUEUE.filter((f) => f.state === "pending").length;

  return (
    <div className="space-y-10">
      <section>
        <SectionHead title="Dashboard" />
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={DEBATES.length} label="Debates" />
          <Stat value={ARTICLES.length} label="Articles" />
          <Stat value={ISSUES.length} label="Issues" />
          <Stat value={pending} label="Moderation queue" tone="oppose" />
        </dl>
      </section>

      <section className="rounded-sm border-l-2 border-lime-deep bg-paper-sunken/60 p-5">
        <h2 className="text-sm font-semibold">Publication rule</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-mute">
          No AI-generated political content is published without human review.
          Drafts produced in the Newsroom land here marked{" "}
          <strong className="font-semibold">Requires review</strong>, and the
          publish control stays disabled until an editor approves them. This
          applies to briefings, party perspectives and key facts alike.
        </p>
      </section>
    </div>
  );
}

function Newsroom() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<(ArticleDraft & { aiBacked: boolean }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setApproved(false);
    try {
      setDraft(await draftBriefing({ topic, sourceNotes: notes }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHead
        title="Newsroom"
        description="Generate a draft briefing for review. Nothing here can publish on its own."
      />

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Topic</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Should the federal minimum wage be increased?"
            className="mt-2 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Source notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Paste the sources and facts the draft may rely on. The generator is instructed to use nothing else."
            className="mt-2 w-full resize-y rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>

        <Button onClick={generate} disabled={!topic.trim() || loading}>
          {loading ? "Drafting…" : "Generate draft briefing"}
        </Button>
      </div>

      {draft && (
        <Card className="animate-rise p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="warn">Requires review</Pill>
            <Pill>{draft.generatedBy === "claude" ? "AI-generated" : "Template scaffold"}</Pill>
            {!draft.aiBacked && <Pill>No API key — scaffold only</Pill>}
          </div>

          <h3 className="mt-4 text-2xl leading-snug">{draft.headline}</h3>
          <p className="mt-2 text-sm text-ink-mute">{draft.subheadline}</p>

          <dl className="mt-6 space-y-4 border-t border-rule pt-5">
            {[
              { term: "What happened", def: draft.whatHappened },
              { term: "Why it matters", def: draft.whyItMatters },
              { term: "What happens next", def: draft.whatHappensNext },
              { term: "Debate question", def: draft.debateQuestion },
              { term: "How Democrats often view it", def: draft.democraticView },
              { term: "How Republicans often view it", def: draft.republicanView },
            ].map((item) => (
              <div key={item.term}>
                <dt className="text-xs font-semibold uppercase tracking-wide">{item.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{item.def}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 border-t border-rule pt-5 sm:grid-cols-2">
            <div>
              <h4 className="eyebrow text-support">Support arguments</h4>
              <ul className="mt-2 space-y-2">
                {draft.supportArguments.map((arg, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ink-soft">{arg}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="eyebrow text-oppose">Oppose arguments</h4>
              <ul className="mt-2 space-y-2">
                {draft.opposeArguments.map((arg, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ink-soft">{arg}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-6 border-t border-rule pt-5 sm:grid-cols-2">
            <div>
              <h4 className="eyebrow text-ink-mute">Key facts</h4>
              <ul className="mt-2 space-y-1.5">
                {draft.keyFacts.map((fact, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ink-soft">· {fact}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="eyebrow text-ink-mute">What is uncertain</h4>
              <ul className="mt-2 space-y-1.5">
                {draft.whatIsUncertain.map((item, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ink-soft">· {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule pt-5">
            <Button
              tone={approved ? "secondary" : "primary"}
              onClick={() => setApproved(true)}
            >
              {approved ? "Approved by editor" : "Approve for publication"}
            </Button>
            <Button tone="secondary" disabled={!approved}>
              Publish
            </Button>
            <span className="text-xs text-ink-faint">
              {approved
                ? "An editor has reviewed this draft. It can now be published."
                : "Publish stays disabled until an editor approves."}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

function DebatesAdmin() {
  return (
    <div className="space-y-6">
      <SectionHead
        title="Debates"
        description="Every debate requires a human-approved briefing before it becomes public."
      />
      <ul className="divide-y divide-rule border-y border-rule">
        {DEBATES.map((debate) => (
          <li key={debate.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{debate.title}</p>
              <p className="mt-0.5 text-xs text-ink-mute">
                {debate.category} · {debate.difficulty} · {debate.format}
              </p>
            </div>
            <Pill tone={debate.status === "live" ? "live" : "neutral"}>{debate.status}</Pill>
            {debate.featured && <Pill tone="accent">Featured</Pill>}
            <Pill>{debate.brief.sources.length} sources</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesAdmin() {
  return (
    <div className="space-y-6">
      <SectionHead
        title="Sources"
        description="The shared catalogue, ordered by the evidence hierarchy students are taught."
      />
      <ul className="divide-y divide-rule border-y border-rule">
        {ALL_SOURCES.map((source) => (
          <li key={source.id} className="py-3.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-medium">{source.publisher}</span>
              <Pill>{source.sourceType}</Pill>
            </div>
            <p className="mt-1 text-xs text-ink-mute">{source.title}</p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-accent underline-offset-2 hover:underline"
            >
              {source.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModerationAdmin() {
  return (
    <div className="space-y-6">
      <SectionHead
        title="Moderation queue"
        description="Political disagreement is never a violation. Only conduct is."
      />
      <ul className="space-y-3">
        {MODERATION_QUEUE.map((flag) => (
          <li key={flag.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill
                  tone={
                    flag.state === "flagged"
                      ? "oppose"
                      : flag.state === "pending"
                        ? "warn"
                        : "support"
                  }
                >
                  {flag.state}
                </Pill>
                <Pill>{flag.reason}</Pill>
                <Pill>{flag.automated ? "Automated" : "User report"}</Pill>
                <span className="ml-auto text-xs text-ink-faint">{flag.reportedAt}</span>
              </div>
              <p className="mt-3 border-l-2 border-rule pl-3 text-sm italic leading-relaxed text-ink-soft">
                {flag.excerpt}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" tone="secondary">Approve</Button>
                <Button size="sm" tone="secondary">Remove</Button>
                <Button size="sm" tone="ghost">Escalate</Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <p className="rounded-sm border border-rule bg-paper-sunken/60 px-4 py-3 text-xs leading-relaxed text-ink-mute">
        Moderation details are never exposed publicly, and a reporter is never
        told the outcome of their report. Reports are rate-limited per user.
      </p>
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-6">
      <SectionHead title={title} />
      <ul className="divide-y divide-rule border-y border-rule">
        {items.map((item) => (
          <li key={item} className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-sm">{item}</span>
            <Eyebrow>Published</Eyebrow>
          </li>
        ))}
      </ul>
    </div>
  );
}
