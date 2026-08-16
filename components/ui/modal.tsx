"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Built on the native <dialog> element: free focus trap, Escape-to-close,
 * and ::backdrop support without hand-rolling any of it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-md rounded-xl border border-border bg-surface p-0 text-foreground shadow-lg",
        "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        "open:rr-animate-in",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
