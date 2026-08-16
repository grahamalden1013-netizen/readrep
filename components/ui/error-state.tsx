"use client";

import { AlertOctagon, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "Give it another try — if this keeps happening, the issue is on our end.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertOctagon className="size-5.5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[16px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-[13.5px] text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
