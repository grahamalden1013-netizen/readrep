import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionResults } from "@/lib/sessions/queries";

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const results = await getSessionResults(sessionId);

  if (!results) {
    notFound();
  }

  if (!results.completed_at) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This session isn&apos;t finished yet.
        </p>
        <Link
          href={`/sessions/${sessionId}`}
          className="mt-2 inline-block text-sm font-medium underline"
        >
          Resume session
        </Link>
      </div>
    );
  }

  const correctCount = results.clips.filter((c) => c.is_correct).length;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Session results
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {correctCount} / {results.clips.length} correct
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {results.clips.map((clip, index) => (
          <li
            key={clip.id}
            className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="font-medium">
              {index + 1}. {clip.prompt}
            </p>
            <p
              className={
                clip.is_correct
                  ? "mt-2 text-sm font-medium text-green-700 dark:text-green-500"
                  : "mt-2 text-sm font-medium text-red-700 dark:text-red-500"
              }
            >
              You picked: {clip.selected_option ?? "No answer"}
              {!clip.is_correct && ` — correct answer: ${clip.correct_option}`}
            </p>
            {clip.feedback && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {clip.feedback}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Link href="/dashboard" className="self-start text-sm font-medium underline">
        Back to dashboard
      </Link>
    </div>
  );
}
