import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function StoryLoading() {
  return (
    <Container className="max-w-[820px] py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-8 h-5 w-24 rounded-full" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-[85%]" />
      </div>
      <div className="mt-6 space-y-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[70%]" />
      </div>
      <div className="mt-8 flex items-center gap-3 border-y border-hairline py-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <Skeleton className="mt-8 aspect-[16/8] w-full rounded-[var(--radius-card)]" />
      <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-hairline sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2.5 bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[80%]" />
          </div>
        ))}
      </div>
      <div className="mt-12 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-4"
            style={{ width: `${72 + ((index * 7) % 25)}%` }}
          />
        ))}
      </div>
    </Container>
  );
}
