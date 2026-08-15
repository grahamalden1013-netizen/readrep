import { notFound } from "next/navigation";
import { SessionPlayer } from "@/components/player/SessionPlayer";
import { getSessionForPlayer } from "@/lib/sessions/queries";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionForPlayer(sessionId);

  if (!session) {
    notFound();
  }

  if (session.clips.length === 0) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This session has no clips yet.
        </p>
      </div>
    );
  }

  if (session.completed_at) {
    const correctCount = session.answered.filter((a) => a.is_correct).length;
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Session already completed
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {correctCount} / {session.clips.length} correct
        </p>
      </div>
    );
  }

  if (!session.video_url) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This session&apos;s film is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <SessionPlayer
        sessionId={session.id}
        videoUrl={session.video_url}
        clips={session.clips}
        initialAnswered={session.answered}
      />
    </div>
  );
}
