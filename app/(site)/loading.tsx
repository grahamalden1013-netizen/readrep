import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <Container wide className="py-12">
      <div className="flex items-baseline justify-between border-b border-hairline pb-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-[80%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[65%]" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="aspect-[5/3] w-full rounded-[var(--radius-card)]" />
      </div>
      <Skeleton className="mt-8 h-28 w-full rounded-[var(--radius-card)]" />
      <div className="mt-16 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[var(--radius-card)] border border-hairline p-2.5"
          >
            <Skeleton className="aspect-[16/9] w-full rounded-[calc(var(--radius-card)-3px)]" />
            <div className="space-y-2.5 p-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
