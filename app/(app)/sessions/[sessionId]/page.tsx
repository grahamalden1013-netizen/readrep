import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { RepSession } from "@/components/session/rep-session";
import { toPublicRep, toReveal, type RepReveal } from "@/lib/reps/public-rep";
import { getGame, getRepsByIds, getSession } from "@/lib/store";
import { getPlayableVideo } from "@/lib/video/playback";

export const metadata: Metadata = { title: "Session" };

export default async function SessionPage({ params }: PageProps<"/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    notFound();
  }
  if (session.completedAt) {
    redirect(`/sessions/${sessionId}/complete`);
  }

  const [game, reps] = await Promise.all([
    getGame(session.gameId),
    getRepsByIds(session.repIds),
  ]);

  const source = game ? getPlayableVideo(game) : null;
  if (!game || !source || reps.length === 0) {
    notFound();
  }

  // Reveals are only sent for reps the player has already committed to.
  const answeredIds = new Set(session.responses.map((response) => response.repId));
  const initialReveals: Record<string, RepReveal> = {};
  for (const response of session.responses) {
    const rep = reps.find((item) => item.id === response.repId);
    if (rep) initialReveals[rep.id] = toReveal(rep, response.choiceId);
  }

  const firstUnanswered = reps.findIndex((rep) => !answeredIds.has(rep.id));
  const resumed = firstUnanswered === -1;

  return (
    <RepSession
      sessionId={session.id}
      gameTitle={game.title}
      source={source}
      reps={reps.map(toPublicRep)}
      initialReveals={initialReveals}
      initialIndex={resumed ? reps.length - 1 : firstUnanswered}
      initialPhase={resumed ? "reveal" : "idle"}
    />
  );
}
