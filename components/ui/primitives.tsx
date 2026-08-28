import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * NGN's shared primitives. Editorial restraint by default: hairline rules,
 * generous whitespace, one accent, and type doing most of the work.
 */

/* -------------------------------------------------------------------------- */
/* Eyebrow + section heads                                                    */
/* -------------------------------------------------------------------------- */

export function Eyebrow({
  children,
  className = "",
  tone = "mute",
}: {
  children: ReactNode;
  className?: string;
  tone?: "mute" | "ink" | "accent" | "live";
}) {
  const tones = {
    mute: "text-ink-mute",
    ink: "text-ink",
    accent: "text-accent",
    live: "text-live",
  } as const;
  return (
    <span className={`eyebrow ${tones[tone]} ${className}`}>{children}</span>
  );
}

export function SectionHead({
  title,
  action,
  description,
}: {
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="section-rule mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl leading-tight sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-mute">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

type ButtonTone = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary:
    "bg-ink text-ink-inverse border border-ink hover:bg-ink-soft active:bg-ink disabled:bg-ink-faint disabled:border-ink-faint",
  secondary:
    "bg-paper-raised text-ink border border-rule-strong hover:border-ink hover:bg-paper-sunken",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-paper-sunken",
  accent:
    "bg-lime text-ink border border-lime-deep hover:bg-lime-deep active:bg-lime-deep",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

function buttonClass(tone: ButtonTone, size: ButtonSize, full?: boolean) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
    BUTTON_TONES[tone],
    BUTTON_SIZES[size],
    full ? "w-full" : "",
  ].join(" ");
}

export function Button({
  tone = "primary",
  size = "md",
  full,
  className = "",
  ...props
}: ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <button
      {...props}
      className={`${buttonClass(tone, size, full)} ${className}`}
    />
  );
}

export function ButtonLink({
  tone = "primary",
  size = "md",
  full,
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <Link {...props} className={`${buttonClass(tone, size, full)} ${className}`} />
  );
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  interactive,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <Tag className={`card ${interactive ? "card-interactive" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Pills, tags, labels                                                        */
/* -------------------------------------------------------------------------- */

type PillTone =
  | "neutral"
  | "support"
  | "oppose"
  | "undecided"
  | "accent"
  | "live"
  | "warn";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "border-rule-strong text-ink-soft bg-paper-raised",
  support: "border-support/30 text-support bg-support-soft",
  oppose: "border-oppose/30 text-oppose bg-oppose-soft",
  undecided: "border-undecided/30 text-undecided bg-undecided-soft",
  accent: "border-accent/25 text-accent bg-accent-soft",
  live: "border-live/30 text-live bg-oppose-soft",
  warn: "border-warn/30 text-warn bg-undecided-soft",
};

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide ${PILL_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function LiveDot() {
  return (
    <span
      aria-hidden
      className="live-dot inline-block size-1.5 rounded-full bg-live"
    />
  );
}

/** Marks seeded participation figures so they are never read as real. */
export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span
      title="Seeded demo content — these figures are illustrative"
      className="inline-flex items-center rounded-sm border border-dashed border-rule-strong px-1.5 py-px text-[0.625rem] font-medium uppercase tracking-[0.1em] text-ink-faint"
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                               */
/* -------------------------------------------------------------------------- */

export function Stat({
  value,
  label,
  tone = "ink",
}: {
  value: ReactNode;
  label: string;
  tone?: "ink" | "support" | "oppose" | "accent";
}) {
  const tones = {
    ink: "text-ink",
    support: "text-support",
    oppose: "text-oppose",
    accent: "text-accent",
  } as const;
  return (
    <div>
      <div className={`tnum text-2xl font-semibold leading-none ${tones[tone]}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </div>
    </div>
  );
}

/** Horizontal meter used for score categories and progress. */
export function Meter({
  value,
  max = 100,
  tone = "ink",
  label,
  valueLabel,
  compact,
}: {
  value: number;
  max?: number;
  tone?: "ink" | "support" | "oppose" | "accent" | "lime";
  label?: string;
  valueLabel?: string;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fills = {
    ink: "bg-ink",
    support: "bg-support",
    oppose: "bg-oppose",
    accent: "bg-accent",
    lime: "bg-lime-deep",
  } as const;

  return (
    <div>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <span className={compact ? "text-xs text-ink-soft" : "text-sm text-ink-soft"}>
              {label}
            </span>
          )}
          {valueLabel && (
            <span className="tnum text-xs font-semibold text-ink">{valueLabel}</span>
          )}
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken"
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${fills[tone]} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden className="block h-px w-10 bg-lime-deep" />
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-mute">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export function Container({
  children,
  className = "",
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "reading";
}) {
  const widths = {
    default: "max-w-6xl",
    wide: "max-w-7xl",
    reading: "max-w-2xl",
  } as const;
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 ${widths[width]} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="border-b border-rule py-8 sm:py-12">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            {eyebrow && <Eyebrow tone="accent">{eyebrow}</Eyebrow>}
            <h1 className="mt-2 text-3xl leading-[1.08] sm:text-4xl lg:text-[2.75rem]">
              {title}
            </h1>
            {lede && (
              <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
                {lede}
              </p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </Container>
    </header>
  );
}
