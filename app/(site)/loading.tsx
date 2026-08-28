import { Container, SkeletonCard, Skeleton } from "@/components/ui/primitives";

/**
 * Route-level loading skeleton. Mirrors the shape of the pages it stands in
 * for — a masthead, then a grid — so the layout does not jump on arrival.
 */
export default function Loading() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading
      </span>
    </Container>
  );
}
