"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Wordmark } from "@/components/wordmark";

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
    <div className="is-document shell-app flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="page-shell flex h-14 items-center">
          <Wordmark href="/dashboard" />
        </div>
      </header>
      <div className="page-shell-narrow flex flex-1 flex-col justify-center gap-6 py-20">
        <PageHeader
          label="Error"
          title="Something broke"
          actions={<Button onClick={reset}>Try again</Button>}
        >
          That page failed to load. Trying again usually fixes it.
        </PageHeader>
      </div>
    </div>
  );
}
