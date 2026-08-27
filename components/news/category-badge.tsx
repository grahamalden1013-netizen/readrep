import Link from "next/link";
import type { CategorySlug } from "@/types/ngn";
import { categoryLabel } from "@/lib/content/categories";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
  href,
}: {
  category: CategorySlug;
  className?: string;
  href?: string;
}) {
  const content = (
    <span
      className={cn(
        "cat inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] transition-colors",
        className,
      )}
      data-cat={category}
      style={{
        background: "color-mix(in oklab, var(--cat) 13%, transparent)",
        color: "color-mix(in oklab, var(--cat) 78%, var(--ink))",
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: "var(--cat)" }}
      />
      {categoryLabel(category)}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
