import type { Comment } from "@/types/ngn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Composer } from "@/components/discussion/composer";
import { PostActions } from "@/components/discussion/post-actions";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ViewerProps {
  signedIn: boolean;
  signInHref: string;
  viewer?: { displayName: string; initials: string; hue: number } | null;
}

function CommentBlock({
  comment,
  depth = 0,
  ...viewerProps
}: { comment: Comment; depth?: number } & ViewerProps) {
  return (
    <div className={cn(depth > 0 && "ml-5 border-l border-hairline pl-5 sm:ml-9 sm:pl-6")}>
      <article className="flex gap-3">
        <Avatar
          initials={comment.author.displayName.slice(0, 2)}
          hue={comment.author.hue}
          size="sm"
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[0.8125rem] font-semibold text-ink">
              {comment.author.displayName}
            </span>
            {comment.author.gradeLabel && (
              <span className="text-[0.6875rem] text-ink-3">
                {comment.author.gradeLabel}
              </span>
            )}
            <span aria-hidden className="text-ink-3/50">
              &middot;
            </span>
            <time
              dateTime={comment.createdAt}
              className="text-[0.6875rem] text-ink-3"
            >
              {formatRelative(comment.createdAt)}
            </time>
          </div>

          <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">
            {comment.body}
          </p>

          <PostActions
            subjectId={comment.id}
            likeLabel="Thoughtful"
            likeCount={comment.likes}
            {...viewerProps}
          />
        </div>
      </article>

      {comment.replies.length > 0 && (
        <div className="mt-5 space-y-5">
          {comment.replies.map((reply) => (
            <CommentBlock
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              {...viewerProps}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  comments,
  signedIn,
  signInHref,
  viewer,
}: { comments: Comment[] } & ViewerProps) {
  return (
    <section aria-labelledby="comments" className="rule-top pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="comments" className="eyebrow text-ink-3">
            Student voices
          </h2>
          <Badge variant="outline">{comments.length} comments</Badge>
        </div>
      </div>

      <div className="mt-5">
        <Composer
          signedIn={signedIn}
          signInHref={signInHref}
          viewer={viewer}
          placeholder="What did this change for you? Be specific."
          submitLabel="Post comment"
        />
      </div>

      {comments.length > 0 ? (
        <div className="mt-8 space-y-7 divide-y divide-hairline [&>*+*]:pt-7">
          {comments.map((comment) => (
            <CommentBlock
              key={comment.id}
              comment={comment}
              signedIn={signedIn}
              signInHref={signInHref}
              viewer={viewer}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-hairline-strong p-8 text-center text-[0.875rem] text-ink-3">
          No comments yet. If something here changed your mind, or did not,
          that is worth writing down.
        </p>
      )}
    </section>
  );
}
