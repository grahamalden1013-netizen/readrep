import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { getCurrentProfile } from "@/lib/profile/queries";
import { getInterviewSnapshot } from "@/lib/interview/queries";
import { toInterviewView } from "@/lib/interview/view";
import { providerMode, REQUIRED_ENV_VAR } from "@/lib/ai/provider";
import { getTeam } from "@/lib/teams/queries";
import { CoachInterview } from "@/components/playbook/coach-interview";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function InterviewPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout redirects

  // Server-side authorization. Players never reach the interview regardless of
  // what the UI offers them, and RLS enforces the same rule underneath.
  if (profile.role !== "coach") redirect("/dashboard");
  if (!profile.team_id) redirect("/coach");

  const mode = providerMode();

  // An honest development state. ReadRep does not fake intelligence when it
  // has no model to think with.
  if (mode === "unconfigured") {
    const team = await getTeam(profile.team_id);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <div className="rr-animate-in">
          <PageHeader
            title="The interview needs a model"
            subtitle={`ReadRep interviews you with a real language model. This install doesn't have one configured, so there is nothing here that could understand ${team?.name ?? "your team"} yet.`}
          />
        </div>
        <div className="rr-animate-in rr-delay-1">
          <EmptyState
            variant="prominent"
            icon={KeyRound}
            title={`${REQUIRED_ENV_VAR} is not set`}
            description={`Add ${REQUIRED_ENV_VAR}=… to .env.local and restart the dev server. Automated tests can instead set READREP_AI_MODE=mock, which runs clearly-labelled scripted answers — never presented as real intelligence.`}
            action={
              <LinkButton href="/coach/playbook" variant="secondary">
                Back to the playbook
              </LinkButton>
            }
          />
        </div>
      </div>
    );
  }

  const snapshot = await getInterviewSnapshot(profile.team_id);

  // No playbook row yet — the first turn creates it, so start from an empty
  // view rather than blocking on a write the coach hasn't asked for.
  const view = snapshot
    ? toInterviewView(snapshot)
    : toInterviewView({
        playbookId: "",
        teamId: profile.team_id,
        teamName: (await getTeam(profile.team_id))?.name ?? "Your team",
        completedAt: null,
        knowledge: [],
        topicStates: [],
        turns: [],
        terms: [],
        scratch: { ambiguities: [], nextTopicId: null },
      });

  return <CoachInterview initialView={view} mode={mode} />;
}

export const dynamic = "force-dynamic";
