"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Something broke</h1>
      <p className="max-w-prose text-sm leading-relaxed text-ink-400">
        That page failed to load. Trying again usually fixes it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
