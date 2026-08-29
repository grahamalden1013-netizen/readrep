import type { Metadata } from "next";
import { UploadFlow } from "@/components/upload/upload-flow";
import { SectionLabel } from "@/components/ui/panel";
import { getBackendAvailability } from "@/lib/db";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
import { getVideoConfig } from "@/lib/video";

// Reads per-request state (signed-in user, stored games), so never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New game" };

export default async function NewGamePage() {
  const [availability, videoConfig] = await Promise.all([
    getBackendAvailability(),
    Promise.resolve(getVideoConfig()),
  ]);

  // Both a place to put the file and a place to record the game are required.
  // If either is missing the flow says so rather than half-working.
  let disabledReason: string | null = null;
  if (videoConfig.kind === "unavailable") {
    disabledReason = videoConfig.reason;
  } else if (availability.kind === "unavailable") {
    disabledReason = availability.reason;
  } else if (availability.kind === "supabase" && !availability.signedIn) {
    disabledReason = "Log in first — uploaded film is stored against your account.";
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>New game</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Add a game</h1>
      </header>
      <UploadFlow
        demoGameId={DEMO_GAME_ID}
        uploadsEnabled={disabledReason === null}
        uploadsDisabledReason={disabledReason}
        fixtureMode={videoConfig.kind === "fixture"}
        storageLabel={availability.kind === "supabase" ? "Supabase" : "a local development file"}
      />
    </div>
  );
}
