import { cn } from "@/lib/utils";

/** Page container. `wide` is used for the homepage and index grids. */
export function Container({
  className,
  wide = false,
  children,
}: {
  className?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        wide ? "max-w-[1400px]" : "max-w-[1200px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
