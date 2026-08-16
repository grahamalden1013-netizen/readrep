import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-28" />
      </div>
      <Skeleton className="h-44 rounded-lg" />
    </div>
  );
}
