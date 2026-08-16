import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile/queries";
import { getTeam } from "@/lib/teams/queries";
import { getPlaybook } from "@/lib/playbook/queries";
import { OnboardingFlow } from "@/components/playbook/onboarding-flow";

export default async function PlaybookOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; step?: string }>;
}) {
  const { edit, step } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null; // layout redirects

  // Server-side authorization: players never reach the editor, regardless of
  // what the UI offers them.
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

  // `?step=` deep-links from the summary's per-section Edit links;
  // `?edit=1` restarts from the top.
  const startStepId = step ?? (edit ? null : (playbook?.lastStep ?? null));

  return (
    <OnboardingFlow
      teamId={profile.team_id}
      teamName={team?.name ?? "Your team"}
      initialAnswers={playbook?.answers ?? {}}
      initialTerms={playbook?.terms ?? []}
      initialCoverageRules={playbook?.coverageRules ?? []}
      startStepId={startStepId}
      isEditing={Boolean(playbook?.completedAt)}
    />
  );
}
