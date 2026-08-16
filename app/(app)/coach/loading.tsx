import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function CoachLoading() {
  return (
    <div className="mx-auto flex max-w-[var(--content-max-w)] flex-col gap-8 px-8 py-10">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-28" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
