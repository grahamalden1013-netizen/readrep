import { redirect } from "next/navigation";
import { BookOpen, Pencil, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getTeam } from "@/lib/teams/queries";
import { getPlaybook, hasProgress } from "@/lib/playbook/queries";
import { playbookCoverage } from "@/lib/playbook/ai-context";
import { visibleSections } from "@/lib/playbook/questions";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

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

  const started = hasProgress(playbook);

  if (!playbook || !started) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <div className="rr-animate-in">
          <PageHeader
            title="Teach ReadRep your system"
            subtitle="The better ReadRep understands how you coach, the better it can train your players to make the reads you want."
          />
        </div>
        <div className="rr-animate-in rr-delay-1">
          <EmptyState
            variant="prominent"
            icon={BookOpen}
            title="Your playbook is empty"
            description="Answer a short set of basketball questions — your offense, your ball-screen reads, your language — and ReadRep will use it to judge decisions the way you would."
            action={<LinkButton href="/coach/playbook/onboarding">Start the interview</LinkButton>}
          />
        </div>
      </div>
    );
  }

  const coverage = playbookCoverage(playbook.answers);
  const sections = visibleSections(playbook.answers);

  // Only render sections that actually have content, so the summary reads as
  // a real profile rather than a form printout with blanks.
  const filled = sections
    .map((section) => ({
      section,
      entries: section.questions
        .map((q) => {
          const a = playbook.answers[q.key];
          if (!a) return null;
          const hasSel = a.selections.length > 0;
          const hasText = Boolean(a.customText?.trim());
          if (!hasSel && !hasText) return null;
          return { question: q, selections: a.selections, text: a.customText?.trim() ?? null };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null),
    }))
    .filter((s) => s.entries.length > 0);

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

      <div className="rr-animate-in rr-delay-2 flex flex-col gap-7">
        {filled.map(({ section, entries }) => (
          <section key={section.slug} className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
              {section.title}
            </h2>
            <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-5 py-4">
              {entries.map(({ question, selections, text }) => (
                <div key={question.key} className="flex flex-col gap-1.5">
                  <dt className="text-[12.5px] text-muted-foreground">{question.label}</dt>
                  <dd className="flex flex-col gap-1.5">
                    {selections.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selections.map((s, i) => (
                          <Badge key={s} tone={question.type === "rank" ? "primary" : "neutral"}>
                            {question.type === "rank" && (
                              <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
                            )}
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {text && (
                      <p className="text-[13.5px] leading-relaxed text-foreground">{text}</p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {playbook.terms.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint-foreground">
              Your language
            </h2>
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
            When film analysis arrives, every decision point gets judged against this playbook —
            your reads, your rules, your language — before ReadRep drafts a question for your
            players.
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
