import type { Metadata } from "next";
import { UploadFlow } from "@/components/upload/upload-flow";
import { PageHeader } from "@/components/app/page-header";
import { getBackendAvailability } from "@/lib/db";
import { DEMO_GAME_ID } from "@/lib/reps/seed";
import { getVideoConfig } from "@/lib/video";

// Reads per-request state (signed-in user, stored games), so never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Upload film" };

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
    <div className="page-shell-narrow flex flex-col gap-8 py-8">
      <PageHeader label="Film" title="Upload a game">
        The whole game, not a clip. You mark the decisions afterwards in Studio, and the film stays
        where it is — nothing is re-encoded on your machine.
      </PageHeader>

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
