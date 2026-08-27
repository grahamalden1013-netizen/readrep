import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import type { Discussion, DiscussionResponse } from "@/types/ngn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostActions } from "./post-actions";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DiscussionCard({ discussion }: { discussion: Discussion }) {
  return (
    <article className="group relative flex flex-col rounded-[var(--radius-card)] border border-hairline bg-surface p-6 shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift">
      <h3 className="text-[1.125rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
        <Link href={`/discuss/${discussion.slug}`} className="after:absolute after:inset-0">
          {discussion.question}
        </Link>
      </h3>
      <p className="mt-3 text-[0.875rem] leading-[1.55] text-ink-2">
        {discussion.context}
      </p>
      <div className="mt-6 flex items-center gap-2 text-[0.75rem] text-ink-3">
        <MessagesSquare className="size-3.5" aria-hidden />
        {discussion.responseCount}{" "}
        {discussion.responseCount === 1 ? "response" : "responses"}
        <span aria-hidden className="text-ink-3/50">
          &middot;
        </span>
        opened {formatRelative(discussion.openedAt)}
      </div>
    </article>
  );
}

/** A single response, used on the discussion page and the homepage module. */
export interface ResponseViewerProps {
  signedIn?: boolean;
  signInHref?: string;
  viewer?: { displayName: string; initials: string; hue: number } | null;
}

export function ResponseBlock({
  response,
  depth = 0,
  className,
  signedIn = false,
  signInHref = "/login",
  viewer,
}: {
  response: DiscussionResponse;
  depth?: number;
  className?: string;
} & ResponseViewerProps) {
  return (
    <div
      className={cn(
        depth > 0 && "ml-5 border-l border-hairline pl-5 sm:ml-8 sm:pl-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          initials={response.author.displayName.slice(0, 2)}
          hue={response.author.hue}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[0.8125rem] font-semibold text-ink">
              {response.author.displayName}
            </span>
            {response.author.gradeLabel && (
              <span className="text-[0.6875rem] text-ink-3">
                {response.author.gradeLabel}
              </span>
            )}
            <span aria-hidden className="text-ink-3/50">
              &middot;
            </span>
            <time className="text-[0.6875rem] text-ink-3">
              {formatRelative(response.createdAt)}
            </time>
          </div>
          <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-2">
            {response.body}
          </p>
          <PostActions
            subjectId={response.id}
            likeLabel="Made me think"
            likeCount={response.madeMeThink}
            signedIn={signedIn}
            signInHref={signInHref}
            viewer={viewer}
          />
        </div>
      </div>

      {response.replies.length > 0 && (
        <div className="mt-5 space-y-5">
          {response.replies.map((reply) => (
            <ResponseBlock
              key={reply.id}
              response={reply}
              depth={depth + 1}
              signedIn={signedIn}
              signInHref={signInHref}
              viewer={viewer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function JoinDiscussionCta({
  href = "/discuss",
  label = "Join the discussion",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Button asChild variant="accent">
      <Link href={href}>
        {label}
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}
