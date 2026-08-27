"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ngn] unhandled error", error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow text-ink-3">Something broke</p>
        <h1 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          This page didn&rsquo;t load
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-6 text-ink-2">
          The failure is on our side, not yours. Trying again usually works; if
          it does not, the daily brief is still available.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[0.6875rem] text-ink-3">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/88"
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
          <Link
            href="/today"
            className="inline-flex h-11 items-center rounded-full border border-hairline-strong px-5 text-[0.875rem] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Today&rsquo;s brief
          </Link>
        </div>
      </div>
    </div>
  );
}
