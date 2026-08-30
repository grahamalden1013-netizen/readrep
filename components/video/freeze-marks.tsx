/**
 * The freeze: amber corner ticks and a hairline drawn over the frame at the
 * instant the film stops and a decision is owed. It is the product's one
 * recurring mark, and it appears in exactly one state — never as decoration.
 */
export function FreezeMarks({ active }: { active: boolean }) {
  const corners = [
    "top-0 left-0 border-t-[3px] border-l-[3px]",
    "top-0 right-0 border-t-[3px] border-r-[3px]",
    "bottom-0 left-0 border-b-[3px] border-l-[3px]",
    "bottom-0 right-0 border-b-[3px] border-r-[3px]",
  ];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ease-signal ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="absolute inset-0 border-2 border-accent/45" />
      {corners.map((corner) => (
        <span key={corner} className={`absolute h-8 w-8 border-accent ${corner}`} />
      ))}
    </div>
  );
}
