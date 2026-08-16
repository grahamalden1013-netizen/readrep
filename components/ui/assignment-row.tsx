import { AssignmentStatusBadge, type AssignmentStatus } from "@/components/ui/status-badge";

export function AssignmentRow({
  playerName,
  gameTitle,
  readCount,
  completedCount,
  status,
  assignedDate,
}: {
  playerName: string;
  gameTitle: string | null;
  readCount: number;
  completedCount: number;
  status: AssignmentStatus;
  assignedDate: string;
}) {
  const pct = readCount === 0 ? 0 : Math.round((completedCount / readCount) * 100);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-foreground">
        {playerName.trim().charAt(0).toUpperCase() || "?"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">{playerName}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {gameTitle ?? "Untitled game"} · {readCount} {readCount === 1 ? "read" : "reads"}
        </p>
      </div>

      <div className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-faint-foreground">{pct}%</span>
      </div>

      <span className="hidden font-mono text-[11.5px] text-faint-foreground md:inline">
        {new Date(assignedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>

      <AssignmentStatusBadge status={status} />
    </div>
  );
}
