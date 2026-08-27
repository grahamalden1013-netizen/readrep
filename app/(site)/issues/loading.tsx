import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function IssuesLoading() {
  return (
    <Container wide className="py-14">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-12 w-full max-w-2xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[var(--radius-card)] border border-hairline p-2.5"
          >
            <Skeleton className="aspect-[16/7] w-full rounded-[calc(var(--radius-card)-3px)]" />
            <div className="space-y-2.5 p-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-[70%]" />
              <Skeleton className="mt-4 h-8 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
