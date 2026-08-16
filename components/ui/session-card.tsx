import Link from "next/link";
import { CheckCircle2, ChevronRight, Play } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function estimateMinutes(readCount: number) {
  return Math.max(1, Math.round((readCount * 80) / 60));
}

/** The orange play-triangle brand mark, reused as the timeline position marker. */
function PlayMarker({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={className} style={style} aria-hidden="true">
      <path d="M1 1L9 5L1 9Z" fill="var(--primary)" />
    </svg>
  );
}

/**
 * The dominant element on the player dashboard when a session is pending —
 * a cinematic film-frame hero. `compact` renders the smaller row used for
 * completed work.
 */
export function SessionCard({
  gameTitle,
  readCount,
  completedCount,
  sessionId,
  compact,
}: {
  gameTitle: string | null;
  readCount: number;
  completedCount: number;
  sessionId: string;
  compact?: boolean;
}) {
  if (compact) {
    const finished = readCount > 0 && completedCount >= readCount;
    return (
      <Link
        href={`/sessions/${sessionId}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors duration-[var(--duration-fast)] hover:border-border-strong hover:bg-surface-2"
      >
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-foreground">
            {gameTitle ?? "Untitled session"}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {finished
              ? `${readCount} ${readCount === 1 ? "read" : "reads"}`
              : `${completedCount} of ${readCount} reads done`}
          </p>
        </div>
        {finished ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-faint-foreground" aria-hidden="true" />
        )}
      </Link>
    );
  }

  const pct = readCount === 0 ? 0 : Math.round((completedCount / readCount) * 100);
  const started = completedCount > 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border-strong bg-surface shadow-md",
        "transition-[border-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg motion-reduce:hover:translate-y-0",
      )}
    >
      {/* Layered film-frame ground — surface steps, no gradient bands */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,var(--surface-2)_0%,var(--surface)_60%)]" aria-hidden="true" />

      <div className="relative flex flex-col gap-6 px-6 pb-5 pt-7 sm:px-8 sm:pt-9">
        <div className="flex flex-col gap-2.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <PlayMarker />
            Your next read
          </p>
          <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[34px]">
            {gameTitle ?? "Untitled session"}
          </h2>
          <p className="text-[14px] text-muted-foreground">
            {readCount} decision {readCount === 1 ? "read" : "reads"} · about{" "}
            {estimateMinutes(readCount)} minutes
          </p>
        </div>

        <LinkButton href={`/sessions/${sessionId}`} size="lg" className="self-start px-7">
          <Play className="size-4" aria-hidden="true" />
          {started ? "Continue session" : "Start session"}
        </LinkButton>
      </div>

      {/* Film timeline: tick ruler, progress fill, play-marker at position */}
      <div className="relative border-t border-border px-6 pb-4 pt-3.5 sm:px-8">
        <div className="rr-ticks relative h-4">
          <div
            className="absolute inset-y-0 left-0 border-r border-primary/60 bg-primary/10 transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
          <PlayMarker
            className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ left: `min(calc(${pct}% + 3px), calc(100% - 10px))` }}
          />
        </div>
        <p className="mt-2 font-mono text-[11px] tabular-nums text-faint-foreground">
          {completedCount} of {readCount} {readCount === 1 ? "read" : "reads"} complete
        </p>
      </div>
    </div>
  );
}
