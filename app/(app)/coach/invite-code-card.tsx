"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function InviteCodeCard({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4">
        <div>
          <p className="text-[13px] font-medium text-foreground">Invite code</p>
          <p className="mt-0.5 font-mono text-[13px] tracking-[0.15em] text-muted-foreground">
            {code}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Share2 className="size-3.5" aria-hidden="true" />
          Share
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite players"
        description="Anyone with this code can join your team from the sign-up page or their dashboard."
      >
        <div className="flex items-center justify-between rounded-md border border-border-strong bg-surface-2 px-4 py-3">
          <span className="font-mono text-[20px] font-semibold tracking-[0.2em] text-foreground">
            {code}
          </span>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? (
              <>
                <Check className="size-3.5 text-success" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </Button>
        </div>
      </Modal>
    </>
  );
}
