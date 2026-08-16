import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/sessions/session-detail";
import { PageHeader } from "@/components/ui/page-header";
import { SessionRunner } from "./session-runner";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);

  if (!session || session.clips.length === 0) {
    notFound();
  }

  const firstUnanswered = session.clips.findIndex((c) => !c.answered);
  const initialIndex = firstUnanswered === -1 ? session.clips.length : firstUnanswered;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title={session.gameTitle ?? "Film session"}
        subtitle="Watch each play, make your read before the decision, then see what actually happened."
      />
      <SessionRunner sessionId={session.id} clips={session.clips} initialIndex={initialIndex} />
    </div>
  );
}
