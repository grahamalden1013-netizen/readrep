import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { getSessionForPlayer } from "@/server/dal/player";
import { denyAsMissing } from "@/server/dal/guard";
import { SessionRunner } from "@/components/session/SessionRunner";

export const metadata: Metadata = { title: "Session" };
export const dynamic = "force-dynamic";

/** Route parameters are user input. Validate before anything reads them. */
const AssignmentIdParam = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/);

export default async function SessionPage({
  params,
}: PageProps<"/session/[assignmentId]">) {
  const { assignmentId } = await params;
  const parsed = AssignmentIdParam.safeParse(assignmentId);
  if (!parsed.success) notFound();

  const session = await denyAsMissing(() => getSessionForPlayer(parsed.data as never));
  if (!session) notFound();

  if (session.moments.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-xl font-semibold tracking-tight">Nothing to work on</h1>
        <p className="text-chalk-400 mt-2 text-sm">
          This session has no reps in it yet.
        </p>
      </div>
    );
  }

  if (session.status === "completed") redirect("/player");

  return <SessionRunner session={session} />;
}
