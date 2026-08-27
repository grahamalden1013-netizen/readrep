import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export function ReadTime({
  minutes,
  className,
}: {
  minutes: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.75rem] text-ink-3",
        className,
      )}
    >
      <Clock3 className="size-3.5" aria-hidden />
      {minutes} min read
    </span>
  );
}

export function MetaDot() {
  return (
    <span aria-hidden className="text-ink-3/50">
      &middot;
    </span>
  );
}

export function PublishedDate({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  return (
    <time
      dateTime={date}
      className={cn("text-[0.75rem] text-ink-3", className)}
    >
      {formatDate(date)}
    </time>
  );
}
