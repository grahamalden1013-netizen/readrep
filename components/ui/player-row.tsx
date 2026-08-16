export function PlayerRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-foreground">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </div>
      <p className="text-[14px] font-medium text-foreground">{name}</p>
    </div>
  );
}
