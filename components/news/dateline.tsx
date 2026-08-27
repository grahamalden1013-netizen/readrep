import { formatDateline } from "@/lib/utils";

/** The masthead strip above the hero: label, date, edition note. */
export function Dateline({
  label = "Today's NGN",
  storyCount,
}: {
  label?: string;
  storyCount?: number;
}) {
  const now = new Date();

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="eyebrow text-accent">{label}</p>
        <time dateTime={now.toISOString()} className="text-[0.8125rem] text-ink-3">
          {formatDateline(now)}
        </time>
      </div>
      {typeof storyCount === "number" && (
        <p className="text-[0.75rem] text-ink-3">
          {storyCount} stories &middot; ranked by significance, not by clicks
        </p>
      )}
    </div>
  );
}
