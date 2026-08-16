import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-faint-foreground">
          {label}
        </p>
        <Icon className="size-3.5 text-faint-foreground" aria-hidden="true" />
      </div>
      <p className="font-mono text-[26px] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </p>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
