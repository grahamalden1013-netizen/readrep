import type { Metadata } from "next";
import { COACH_RULE_TOPIC_LABEL } from "@readrep/domain";
import { getCoachTeamId } from "@/server/dal/coach";
import { getActiveCoachSystem, getCoachSystemHistory } from "@/server/dal/coach-system";
import { QUESTIONS } from "@/server/questionnaire";
import { SystemSurvey, type SurveyQuestion } from "@/components/coach/SystemSurvey";

export const metadata: Metadata = { title: "Your system" };
export const dynamic = "force-dynamic";

export default async function CoachSystemPage() {
  const teamId = await getCoachTeamId();
  if (!teamId) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-xl font-semibold tracking-tight">No team</h1>
        <p className="text-chalk-400 mt-2 text-sm">
          This account does not coach or administer a team.
        </p>
      </div>
    );
  }

  const [system, history] = await Promise.all([
    getActiveCoachSystem(teamId),
    getCoachSystemHistory(teamId),
  ]);

  const questions: SurveyQuestion[] = QUESTIONS.map((q) => ({
    id: q.id,
    topic: q.topic,
    topicLabel: COACH_RULE_TOPIC_LABEL[q.topic],
    prompt: q.prompt,
    ...(q.help ? { help: q.help } : {}),
    followUpPrompt: q.followUpPrompt,
    options: q.options.map((o) => ({
      value: o.value,
      label: o.label,
      statement: o.statement,
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your system</h1>
      <p className="text-chalk-400 mt-1.5 max-w-2xl text-sm leading-relaxed">
        These answers become the rules ReadRep cites when it explains a decision to your
        players. Where you have not set a rule, advice is labelled general basketball
        reasoning rather than presented as your team&apos;s requirement.
      </p>

      {history.length > 1 && (
        <p className="text-chalk-500 mt-3 text-xs">
          {history.length} revisions. Earlier revisions are kept so a moment approved
          against revision {history[history.length - 1]?.revision} still cites the
          wording that was in force then.
        </p>
      )}

      <div className="mt-8">
        <SystemSurvey
          questions={questions}
          initialAnswers={system?.answers ?? {}}
          initialSummary={system?.summary ?? null}
          currentRevision={system?.revision ?? null}
        />
      </div>
    </div>
  );
}
