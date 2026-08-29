import type { Metadata } from "next";
import { UploadFlow } from "@/components/upload/upload-flow";
import { SectionLabel } from "@/components/ui/panel";
import { DEMO_GAME_ID } from "@/lib/reps/seed";

export const metadata: Metadata = { title: "New game" };

export default function NewGamePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <SectionLabel>New game</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Add a game</h1>
      </header>
      <UploadFlow demoGameId={DEMO_GAME_ID} />
    </div>
  );
}
