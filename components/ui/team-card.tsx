"use client";

import { useState } from "react";
import { Check, Copy, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function TeamCard({ name, playerCount, inviteCode }: { name: string; playerCount: number; inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
            <Users className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[14.5px] font-medium text-foreground">{name}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {playerCount} {playerCount === 1 ? "player" : "players"} on the roster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 py-1.5 font-mono text-[13px] tracking-[0.1em] text-foreground transition-colors hover:border-primary/40"
            aria-label={`Copy invite code ${inviteCode}`}
          >
            {inviteCode}
            {copied ? (
              <Check className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5 text-faint-foreground" aria-hidden="true" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
