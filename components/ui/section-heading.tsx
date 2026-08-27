import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The repeating NGN section header: mono eyebrow, hairline rule, optional link.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "See all",
  tone = "accent",
  className,
}: {
  eyebrow: string;
  title?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: "accent" | "editorial" | "ink";
  className?: string;
}) {
  const toneClass = {
    accent: "text-accent",
    editorial: "text-editorial",
    ink: "text-ink-3",
  }[tone];

  return (
    <div className={cn("rule-top pt-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className={cn("eyebrow", toneClass)}>{eyebrow}</p>
        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            {linkLabel}
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {title && (
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-6 text-ink-3">
          {description}
        </p>
      )}
    </div>
  );
}
