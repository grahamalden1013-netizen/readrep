import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-foreground",
          "placeholder:text-faint-foreground",
          "outline-none transition-colors duration-[var(--duration-fast)]",
          "focus:border-primary focus:ring-2 focus:ring-primary/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
};

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
        {optional && <span className="text-[12px] text-faint-foreground">Optional</span>}
      </div>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-[12.5px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
