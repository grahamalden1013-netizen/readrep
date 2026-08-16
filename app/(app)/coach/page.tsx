import { getCoachTeam } from "@/lib/coach/queries";

export default async function CoachPage() {
  const team = await getCoachTeam();

  if (!team) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You don&apos;t have a coach account for a team.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        {team.invite_code && (
          <p className="text-sm text-zinc-500">
            Invite code: <span className="font-mono">{team.invite_code}</span>
          </p>
        )}
      </div>

      {team.roster.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No players on your team yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-6 font-medium">Player</th>
                <th className="py-2 pr-6 font-medium">Sessions</th>
                <th className="py-2 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {team.roster.map((player) => (
                <tr
                  key={player.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 pr-6">
                    {player.full_name || "Unnamed player"}
                  </td>
                  <td className="py-2 pr-6 text-zinc-600 dark:text-zinc-400">
                    {player.sessionsCompleted} / {player.sessionsAssigned}{" "}
                    completed
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">
                    {player.predictionsTotal > 0
                      ? `${Math.round(
                          (player.predictionsCorrect / player.predictionsTotal) *
                            100,
                        )}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
