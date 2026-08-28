/**
 * The two-column "what each side argues" block.
 *
 * The columns are always the same width and always carry the same number of
 * arguments. Giving one side more space is the most common way a briefing
 * stops being neutral without anyone deciding to make it partisan.
 */
export function ArgumentColumns({
  supportTitle = "What supporters argue",
  opposeTitle = "What opponents argue",
  support,
  oppose,
}: {
  supportTitle?: string;
  opposeTitle?: string;
  support: string[];
  oppose: string[];
}) {
  const columns = [
    { title: supportTitle, items: support, color: "var(--color-support)" },
    { title: opposeTitle, items: oppose, color: "var(--color-oppose)" },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10">
      {columns.map((column) => (
        <section key={column.title}>
          <h3
            className="border-t-2 pt-3 text-base font-semibold"
            style={{ borderColor: column.color, color: column.color }}
          >
            {column.title}
          </h3>
          <ol className="mt-4 space-y-4">
            {column.items.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden
                  className="tnum mt-0.5 shrink-0 text-xs font-semibold text-ink-faint"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * Party perspective block. Only renders sections that exist, because plenty of
 * civic questions do not split along party lines and inventing a party
 * position where none exists is its own distortion.
 */
export function PartyPerspectives({
  democraticView,
  republicanView,
  democraticDisagreement,
  republicanDisagreement,
  otherPerspectives,
}: {
  democraticView?: string;
  republicanView?: string;
  democraticDisagreement?: string;
  republicanDisagreement?: string;
  otherPerspectives?: string[];
}) {
  if (!democraticView && !republicanView) return null;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        {democraticView && (
          <section>
            <h3 className="eyebrow text-ink-mute">How Democrats often view it</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              {democraticView}
            </p>
          </section>
        )}
        {republicanView && (
          <section>
            <h3 className="eyebrow text-ink-mute">How Republicans often view it</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              {republicanView}
            </p>
          </section>
        )}
      </div>

      {(democraticDisagreement || republicanDisagreement) && (
        <div className="border-l-2 border-lime-deep bg-paper-sunken/60 p-5">
          <h3 className="text-base font-semibold">
            Important disagreements within each side
          </h3>
          <p className="mt-1.5 text-xs text-ink-mute">
            Neither party is one belief. If you argue against a whole party
            rather than against a position, expect your rebuttal score to suffer.
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {democraticDisagreement && (
              <div>
                <h4 className="text-sm font-medium">Where Democrats disagree</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {democraticDisagreement}
                </p>
              </div>
            )}
            {republicanDisagreement && (
              <div>
                <h4 className="text-sm font-medium">Where Republicans disagree</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {republicanDisagreement}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {otherPerspectives && otherPerspectives.length > 0 && (
        <section>
          <h3 className="eyebrow text-ink-mute">Other perspectives</h3>
          <ul className="mt-3 space-y-3">
            {otherPerspectives.map((item, index) => (
              <li key={index} className="text-[0.9375rem] leading-relaxed text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
