import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { aiEnabled } from "@/lib/ai";
import { Container } from "@/components/layout/container";
import { NewStoryWorkbench } from "@/components/admin/new-story-workbench";

export const metadata: Metadata = { title: "New story" };

export default function NewStoryPage() {
  return (
    <Container wide className="py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Newsroom
      </Link>

      <div className="mt-7 max-w-3xl">
        <p className="eyebrow text-accent">New story</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
          Start from the sources
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-6 text-ink-2">
          Enter what you have, generate a first draft, then edit every field.
          A generated draft enters the queue as{" "}
          <span className="font-mono text-[0.875rem]">ai_generated</span> and
          cannot reach readers without a human approving it.
        </p>
      </div>

      <div className="mt-10">
        <NewStoryWorkbench aiConnected={aiEnabled()} />
      </div>
    </Container>
  );
}
