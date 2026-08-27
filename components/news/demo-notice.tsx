import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NGN's demo build is populated with illustrative stories about real, ongoing
 * policy processes. Nothing here is live reporting, and the product says so
 * everywhere the content appears.
 */
export function DemoNotice({
  className,
  variant = "inline",
}: {
  className?: string;
  variant?: "inline" | "block";
}) {
  if (variant === "block") {
    return (
      <aside
        className={cn(
          "flex gap-3 rounded-xl border border-hairline bg-surface-2 px-4 py-3.5",
          className,
        )}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        <p className="text-[0.8125rem] leading-5 text-ink-2">
          <span className="font-semibold text-ink">Demo content.</span> This
          story is an illustrative example written to show how NGN explains a
          real, ongoing policy debate. It is not live reporting, and its source
          cards are placeholders rather than fetched documents.
        </p>
      </aside>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border border-hairline px-2 font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-ink-3",
        className,
      )}
      title="Illustrative example content, not live reporting"
    >
      Demo
    </span>
  );
}
