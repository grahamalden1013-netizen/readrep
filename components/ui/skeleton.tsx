import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[linear-gradient(110deg,var(--surface-2)8%,var(--surface-3)18%,var(--surface-2)33%)]",
        "bg-[length:200%_100%] motion-safe:animate-[rr-shimmer_1.6s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonText lines={2} className="mt-4" />
    </div>
  );
}
