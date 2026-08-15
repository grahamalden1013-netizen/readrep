import Link from "next/link";
import { getAssignedSessions } from "@/lib/sessions/queries";

export default async function DashboardPage() {
  const sessions = await getAssignedSessions();

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your sessions</h1>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No film sessions assigned yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {session.game_title ?? "Untitled session"}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {session.clip_count}{" "}
                    {session.clip_count === 1 ? "clip" : "clips"}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">
                  {session.completed_at ? "Completed" : "In progress"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
