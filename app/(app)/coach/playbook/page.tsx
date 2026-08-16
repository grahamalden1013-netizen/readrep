import { redirect } from "next/navigation";
import { BookOpen, Pencil, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getTeam } from "@/lib/teams/queries";
import { getPlaybook, hasProgress, type CoverageRule } from "@/lib/playbook/queries";
import { playbookCoverage } from "@/lib/playbook/ai-context";
import {
  COVERAGE_LABELS,
  ROLE_LABELS,
  SECTIONS,
  flattenSteps,
  questionByKey,
  type Answers,
  type Coverage,
} from "@/lib/playbook/questions";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

/** Groups of the profile, in the order a coach would want to read them. */
const PROFILE_AREAS: { heading: string; sectionSlugs: string[] }[] = [
  { heading: "Team", sectionSlugs: ["identity"] },
  { heading: "Offensive identity", sectionSlugs: ["offense"] },
  { heading: "Ball-screen reads", sectionSlugs: ["ball-screen-offense"] },
  { heading: "Transition", sectionSlugs: ["transition"] },
  { heading: "Defensive identity", sectionSlugs: ["defense"] },
  { heading: "Ball-screen defense", sectionSlugs: ["ball-screen-defense"] },
  { heading: "Coaching priorities", sectionSlugs: ["priorities"] },
  { heading: "Player development", sectionSlugs: ["development"] },
];

function CoverageBlock({ rules, phase }: { rules: CoverageRule[]; phase: "offense" | "defense" }) {
  const relevant = rules.filter(
    (r) => r.phase === phase && (r.reads.length > 0 || r.note),
  );
  if (relevant.length === 0) return null;

  const byCoverage = new Map<Coverage, CoverageRule[]>();
  for (const r of relevant) {
    const list = byCoverage.get(r.coverage) ?? [];
    list.push(r);
    byCoverage.set(r.coverage, list);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {[...byCoverage.entries()].map(([coverage, rules]) => (
        <div key={coverage} className="rounded-lg border border-border bg-surface px-4 py-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
            vs {COVERAGE_LABELS[coverage]}
          </p>
          <dl className="mt-2.5 flex flex-col gap-2">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <dt className="text-[12.5px] text-muted-foreground sm:w-36 sm:shrink-0">
                  {ROLE_LABELS[r.role] ?? r.role}
                </dt>
                <dd className="flex flex-1 flex-wrap items-baseline gap-1.5">
                  {r.reads.map((read) => (
                    <Badge key={read} tone="neutral">
                      {read}
                    </Badge>
                  ))}
                  {r.note && (
                    <span className="text-[13px] leading-relaxed text-foreground">{r.note}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function answeredEntries(answers: Answers, sectionSlugs: string[]) {
  const keys = SECTIONS.filter((s) => sectionSlugs.includes(s.slug)).flatMap((s) =>
    s.steps.flatMap((st) => (st.kind === "questions" ? st.questions.map((q) => q.key) : [])),
  );

  return keys
    .map((key) => {
      const a = answers[key];
      if (!a) return null;
      const hasSel = a.selections.length > 0;
      const hasText = Boolean(a.customText?.trim());
      if (!hasSel && !hasText) return null;
      const q = questionByKey(key);
      if (!q) return null;
      return { key, label: q.label, ranked: q.type === "rank", selections: a.selections, text: a.customText?.trim() ?? null };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

export default async function PlaybookPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (profile.role !== "coach") {
    redirect("/dashboard");
  }
  if (!profile.team_id) {
    redirect("/coach");
  }

  const [team, playbook] = await Promise.all([
    getTeam(profile.team_id),
    getPlaybook(profile.team_id),
  ]);

  if (!playbook || !hasProgress(playbook)) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <div className="rr-animate-in">
          <PageHeader
            title="Teach ReadRep your system"
            subtitle="Two coaches can watch the same possession and want different decisions. The better ReadRep understands how you coach, the better it can train your players to make the reads you want."
          />
        </div>
        <div className="rr-animate-in rr-delay-1">
          <EmptyState
            variant="prominent"
            icon={BookOpen}
            title="Your playbook is empty"
            description="It's an interview, not a form — one question at a time, and it adapts to what you actually run. You can stop and pick it up whenever."
            action={<LinkButton href="/coach/playbook/onboarding">Start the interview</LinkButton>}
          />
        </div>
      </div>
    );
  }

  const coverage = playbookCoverage(playbook.answers);
  const steps = flattenSteps(playbook.answers);

  // First step id per section, so each area's Edit link deep-links correctly.
  const firstStepOf = new Map<string, string>();
  for (const s of steps) {
    if (!firstStepOf.has(s.section.slug)) firstStepOf.set(s.section.slug, s.step.id);
  }

  const areas = PROFILE_AREAS.map((area) => ({
    ...area,
    entries: answeredEntries(playbook.answers, area.sectionSlugs),
    editStep: area.sectionSlugs.map((slug) => firstStepOf.get(slug)).find(Boolean),
  })).filter(
    (area) =>
      area.entries.length > 0 ||
      (area.heading === "Ball-screen reads" &&
        playbook.coverageRules.some((r) => r.phase === "offense")) ||
      (area.heading === "Ball-screen defense" &&
        playbook.coverageRules.some((r) => r.phase === "defense")),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div className="rr-animate-in">
        <PageHeader
          title="Your ReadRep Playbook"
          subtitle={`How ${team?.name ?? "your team"} plays, in ReadRep's words.`}
          actions={
            <LinkButton href="/coach/playbook/onboarding?edit=1" variant="secondary" size="sm">
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit playbook
            </LinkButton>
          }
        />
      </div>

      <div className="rr-animate-in rr-delay-1 flex flex-wrap items-center gap-2">
        {playbook.completedAt ? (
          <Badge tone="success">Complete</Badge>
        ) : (
          <Badge tone="warning">In progress</Badge>
        )}
        <Badge tone="neutral">
          {coverage.answered} of {coverage.total} questions answered
        </Badge>
        {playbook.coverageRules.length > 0 && (
          <Badge tone="primary">{playbook.coverageRules.length} coverage rules</Badge>
        )}
        {playbook.terms.length > 0 && (
          <Badge tone="primary">
            {playbook.terms.length} custom {playbook.terms.length === 1 ? "term" : "terms"}
          </Badge>
        )}
      </div>

      {!playbook.completedAt && (
        <div className="rr-animate-in rr-delay-1 flex flex-col gap-3 rounded-lg border border-dashed border-border-strong px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13.5px] font-medium text-foreground">Pick up where you left off</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              You haven&apos;t finished the interview yet.
            </p>
          </div>
          <LinkButton href="/coach/playbook/onboarding" size="sm">
            Continue
          </LinkButton>
        </div>
      )}

      <div className="rr-animate-in rr-delay-2 flex flex-col gap-8">
        {areas.map((area) => (
          <section key={area.heading} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
                {area.heading}
              </h2>
              {area.editStep && (
                <LinkButton
                  href={`/coach/playbook/onboarding?step=${area.editStep}`}
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1.5 py-0.5 text-[12px]"
                >
                  Edit
                </LinkButton>
              )}
            </div>

            {area.entries.length > 0 && (
              <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-5 py-4">
                {area.entries.map((e) => (
                  <div key={e.key} className="flex flex-col gap-1.5">
                    <dt className="text-[12.5px] text-muted-foreground">{e.label}</dt>
                    <dd className="flex flex-col gap-1.5">
                      {e.selections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {e.selections.map((s, i) => (
                            <Badge key={s} tone={e.ranked ? "primary" : "neutral"}>
                              {e.ranked && (
                                <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
                              )}
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {e.text && (
                        <p className="text-[13.5px] leading-relaxed text-foreground">{e.text}</p>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {area.heading === "Ball-screen reads" && (
              <CoverageBlock rules={playbook.coverageRules} phase="offense" />
            )}
            {area.heading === "Ball-screen defense" && (
              <CoverageBlock rules={playbook.coverageRules} phase="defense" />
            )}
          </section>
        ))}

        {playbook.terms.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
                Team terminology
              </h2>
              <LinkButton
                href="/coach/playbook/onboarding?step=terminology"
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-[12px]"
              >
                Edit
              </LinkButton>
            </div>
            <ul className="flex flex-col gap-2">
              {playbook.terms.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <span className="font-mono text-[13.5px] font-semibold uppercase tracking-wide text-primary sm:w-32 sm:shrink-0">
                    {t.term}
                  </span>
                  <span className="flex-1 text-[13.5px] leading-relaxed text-foreground">
                    {t.meaning}
                  </span>
                  <Badge tone="neutral" className="self-start capitalize">
                    {t.category}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="rr-animate-in rr-delay-3 flex items-start gap-3 rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-foreground">
            This is what ReadRep will reason from
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
            When film analysis arrives, ReadRep pulls only the parts of this playbook that bear on
            the possession — your ball-screen rules for that exact coverage, your spacing reads,
            your language — before drafting a question for your players.
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
