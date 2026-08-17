"use client";

import { useState, useTransition } from "react";

import { syncSchoology } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";

export function SyncButton({ lastSyncedAt }: { lastSyncedAt: Date | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sync() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await syncSchoology();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { added, updated, removed } = result.data;
      setMessage(
        added === 0 && removed === 0
          ? `Up to date · ${updated} checked`
          : `${added} new · ${updated} updated${removed > 0 ? ` · ${removed} removed` : ""}`,
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button onClick={sync} disabled={pending} variant="secondary" size="sm">
        {pending ? "Syncing…" : "Sync Schoology"}
      </Button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : message ? (
        <span className="text-xs text-muted">{message}</span>
      ) : lastSyncedAt ? (
        <span className="text-xs text-muted">
          Synced {formatRelativeTime(lastSyncedAt)}
        </span>
      ) : (
        <span className="text-xs text-muted">Never synced</span>
      )}
    </div>
  );
}
