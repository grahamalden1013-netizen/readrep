import { DemoBadge } from "@/components/ui/primitives";

/**
 * The live position split on a debate.
 *
 * Note what this is NOT: a poll result, or a signal of which side is "winning".
 * It shows where students currently stand so an undecided reader can see the
 * question is genuinely contested — never to nudge them toward the majority.
 */
export function SentimentBar({
  support,
  oppose,
  undecided,
  showDemoBadge = true,
}: {
  support: number;
  oppose: number;
  undecided: number;
  showDemoBadge?: boolean;
}) {
  const rows = [
    { label: "Support", value: support, color: "var(--color-support)" },
    { label: "Oppose", value: oppose, color: "var(--color-oppose)" },
    { label: "Undecided", value: undecided, color: "var(--color-undecided)" },
  ];

  return (
    <div>
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken"
        role="img"
        aria-label={`Current positions: ${support}% support, ${oppose}% oppose, ${undecided}% undecided`}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{ width: `${row.value}%`, backgroundColor: row.color }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {rows.map((row) => (
          <span key={row.label} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="tnum font-semibold text-ink">{row.value}%</span>
            {row.label}
          </span>
        ))}
        {showDemoBadge && <DemoBadge />}
      </div>
    </div>
  );
}
