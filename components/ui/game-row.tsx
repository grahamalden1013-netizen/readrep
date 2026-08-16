import { Film } from "lucide-react";
import { GameStatusBadge, type GameStatus } from "@/components/ui/status-badge";

/**
 * Deliberately over-built relative to what today's data provides: opponent,
 * thumbnail, and status only render when passed, so this component is
 * ready for the real upload/processing pipeline without needing a rewrite
 * when that lands. Today, only title/date/clipCount are real.
 */
export function GameRow({
  title,
  opponent,
  date,
  status,
  clipCount,
  thumbnailUrl,
}: {
  title: string;
  opponent?: string;
  date: string;
  status?: GameStatus;
  clipCount: number;
  thumbnailUrl?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 text-faint-foreground">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <Film className="size-4" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">
          {opponent ? `vs. ${opponent}` : title}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {opponent && <span className="mr-1.5">{title}</span>}
          {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" · "}
          {clipCount} {clipCount === 1 ? "moment" : "moments"}
        </p>
      </div>

      {status && <GameStatusBadge status={status} />}
    </div>
  );
}
