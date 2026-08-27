import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <Container className="max-w-[900px] py-12">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-12 w-80" />
      <Skeleton className="mt-4 h-5 w-full max-w-lg" />
      <div className="mt-10 space-y-12">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <Skeleton className="h-9 w-10" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
