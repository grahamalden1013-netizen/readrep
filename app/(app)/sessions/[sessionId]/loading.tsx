import { Skeleton } from "@/components/ui/skeleton";

export default function SessionLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}
