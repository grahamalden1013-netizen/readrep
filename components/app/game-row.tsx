import type { ReactNode } from "react";
import { StatusDot } from "@/components/ui/chip";
import type { Game } from "@/lib/reps/schema";

export type GameStatus = {
  text: string;
  tone: "good" | "bad" | "neutral";
  ready: boolean;
};

/** One reading of a game's video state, shared by every screen that lists film. */
export function gameStatus(game: Game): GameStatus {
  if (game.origin === "demo")
    return { text: "Seeded demo film", tone: "good", ready: true };

  const asset = game.videoAsset;
  if (!asset) return { text: "No video", tone: "bad", ready: false };

  switch (asset.status) {
    case "ready":
      return { text: "Ready", tone: "good", ready: true };
    case "errored":
      return { text: asset.error ?? "Failed", tone: "bad", ready: false };
    case "cancelled":
      return { text: "Cancelled", tone: "bad", ready: false };
    case "processing":
      return { text: "Processing", tone: "neutral", ready: false };
    default:
      return { text: "Waiting for upload", tone: "neutral", ready: false };
  }
}

export function GameRow({
  game,
  status,
  repCount,
  draftCount,
  actions,
}: {
  game: Game;
  status: GameStatus;
  repCount?: number;
  draftCount?: number;
  actions: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line bg-surface px-4 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{game.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-fg-faint">
          <span className="timecode">{game.playedOn}</span>
          <span>
            {game.identity.teamColor} #{game.identity.jerseyNumber}
          </span>
          <StatusDot tone={status.tone === "neutral" ? "neutral" : status.tone}>
            {status.text}
          </StatusDot>
          {repCount !== undefined ? (
            <span>
              {repCount} {repCount === 1 ? "rep" : "reps"}
              {draftCount ? ` · ${draftCount} draft` : ""}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

export function GameList({ children }: { children: ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-panel border border-line">
      {children}
    </ul>
  );
}
