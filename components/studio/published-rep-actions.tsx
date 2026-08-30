"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startSessionForGame } from "@/lib/actions/session";

/** Takes the reviewer straight from publishing into the session a player gets. */
export function PublishedRepActions({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function play() {
    setStarting(true);
    setError(null);
    const result = await startSessionForGame(gameId);
    if (!result.ok) {
      setStarting(false);
      setError(result.error);
      return;
    }
    router.push(`/sessions/${result.data.sessionId}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {error ? <span className="text-sm text-bad">{error}</span> : null}
      <Button onClick={() => void play()} disabled={starting}>
        {starting ? "Starting…" : "Take this session"}
      </Button>
    </div>
  );
}
