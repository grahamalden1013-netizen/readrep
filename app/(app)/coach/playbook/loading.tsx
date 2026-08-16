import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybookLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
