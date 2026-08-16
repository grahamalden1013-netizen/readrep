import { CheckCircle2, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

function estimateMinutes(readCount: number) {
  return Math.max(1, Math.round((readCount * 80) / 60));
}

/**
 * The dominant element on the player dashboard when a session is pending —
 * hero variant. `compact` renders the smaller row used for completed work.
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
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-[14px] font-medium text-foreground">{gameTitle ?? "Untitled session"}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {readCount} {readCount === 1 ? "read" : "reads"}
          </p>
        </div>
        <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
      </div>
    );
  }

  const pct = readCount === 0 ? 0 : Math.round((completedCount / readCount) * 100);
  const started = completedCount > 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-6">
        <div>
          <p className="text-[19px] font-semibold tracking-tight text-foreground">
            {gameTitle ?? "Untitled session"}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {readCount} decision {readCount === 1 ? "read" : "reads"} · about{" "}
            {estimateMinutes(readCount)} minutes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[12px] tabular-nums text-faint-foreground">
            {completedCount}/{readCount}
          </span>
        </div>

        <LinkButton href={`/sessions/${sessionId}`} size="lg" className="self-start">
          <Play className="size-4" aria-hidden="true" />
          {started ? "Continue session" : "Start session"}
        </LinkButton>
      </CardContent>
    </Card>
  );
}
