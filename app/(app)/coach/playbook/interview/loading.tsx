import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:flex-row lg:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-72" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-20 w-[46ch] max-w-full rounded-lg" />
          <Skeleton className="ml-auto h-14 w-[34ch] max-w-full rounded-lg" />
          <Skeleton className="h-24 w-[46ch] max-w-full rounded-lg" />
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[22rem]">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}
