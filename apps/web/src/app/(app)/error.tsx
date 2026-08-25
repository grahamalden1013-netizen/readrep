"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The backstop for anything that escapes a page.
 *
 * Authorization denials are converted to `notFound()` before they reach here
 * (see `server/dal/guard.ts`), so this renders for genuine faults. It shows no
 * error detail: messages routinely carry resource ids and provider responses,
 * and this is a product used by minors and their families, not an operator
 * console.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // The server has already logged this with redaction. Nothing to add here.
  }, []);

  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-chalk-400 mt-2 text-sm leading-relaxed">
        This is on us, not on you. Nothing you entered was lost.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-court-500 text-ink-950 hover:bg-court-400 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          Try again
        </button>
        <Link
          href="/player"
          className="border-ink-600 text-chalk-200 hover:border-ink-500 rounded-lg border px-5 py-2.5 text-sm font-medium"
        >
          Back to sessions
        </Link>
      </div>
    </div>
  );
}
