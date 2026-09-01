import type { Metadata } from "next";
import { CoachingSurvey } from "@/components/settings/coaching-survey";
import { PageHeader } from "@/components/app/page-header";
import { loadCoachingProfile } from "@/lib/actions/coaching";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coaching profile" };

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { next } = await searchParams;
  const profile = await loadCoachingProfile();
  const initialAnswers = (profile?.answers ?? {}) as Record<string, string>;
  const redirectTo = typeof next === "string" && next.startsWith("/") ? next : undefined;

  return (
    <div className="page-shell-narrow flex flex-col gap-8 py-8">
      <PageHeader label="Settings" title="Coaching profile">
        Answered once and reused for every game you analyse. NextRep uses these preferences only
        when a decision on the tape actually calls for them — the player never sees them.
      </PageHeader>

      <CoachingSurvey initialAnswers={initialAnswers} redirectTo={redirectTo} />
    </div>
  );
}
