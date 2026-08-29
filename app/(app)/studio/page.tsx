import type { Metadata } from "next";
import { RepEditor } from "@/components/studio/rep-editor";
import { Panel, SectionLabel } from "@/components/ui/panel";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { DEMO_REPS } from "@/lib/reps/seed";

export const metadata: Metadata = { title: "Rep studio" };

function formatMs(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export default function StudioPage() {
  const template = JSON.stringify(
    { ...DEMO_REPS[0], id: "demo-rep-6", order: 6 },
    null,
    2,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>Internal</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Rep studio</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-400">
          Reps are checked into the repository so they get reviewed like code. This page validates
          a draft against the real schema and gives you the canonical JSON to paste into{" "}
          <code className="font-mono text-ink-300">lib/reps/seed.ts</code>.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <SectionLabel>Current reps</SectionLabel>
        <ul className="flex flex-col gap-2">
          {DEMO_REPS.map((rep) => (
            <Panel as="li" key={rep.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
              <span className="font-mono text-xs text-ink-600">{rep.id}</span>
              <span className="text-sm text-ink-100">{rep.title}</span>
              <span className="label-caps text-ink-500">
                {SKILL_CATEGORY_LABELS[rep.category]}
              </span>
              <span className="ml-auto font-mono text-xs text-ink-500">
                {formatMs(rep.clipStartMs)} → {formatMs(rep.decisionPauseMs)} →{" "}
                {formatMs(rep.clipEndMs)}
              </span>
            </Panel>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Draft a rep</SectionLabel>
        <RepEditor initialJson={template} />
      </section>
    </div>
  );
}
