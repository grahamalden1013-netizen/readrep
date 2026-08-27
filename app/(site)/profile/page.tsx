import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { getPublishedArticles, toSummary } from "@/lib/content/repository";
import { logout } from "@/app/(auth)/actions";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SavedList } from "@/components/article/saved-list";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?redirectTo=%2Fprofile");

  const articles = await getPublishedArticles();

  return (
    <Container className="max-w-[860px] py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <Avatar initials={viewer.initials} hue={viewer.hue} size="xl" />
          <div>
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
              {viewer.displayName}
            </h1>
            <p className="mt-1 font-mono text-[0.8125rem] text-ink-3">
              @{viewer.username}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {viewer.role === "editor" && (
                <Badge variant="accent" size="md">
                  Editor
                </Badge>
              )}
              {viewer.isDemo && (
                <Badge variant="outline" size="md">
                  Demo session
                </Badge>
              )}
              <span className="text-[0.75rem] text-ink-3">
                Joined {formatDate(viewer.joinedAt)}
              </span>
            </div>
          </div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <h2 className="eyebrow text-ink-3">Profile details</h2>
          <dl className="mt-4 space-y-3.5">
            <Row label="Display name" value={viewer.displayName} />
            <Row label="Username" value={`@${viewer.username}`} />
            <Row
              label="Grade"
              value={viewer.gradeLabel ?? "Not set"}
              muted={!viewer.gradeLabel}
            />
            <Row
              label="School"
              value={viewer.schoolLabel ?? "Not set"}
              muted={!viewer.schoolLabel}
            />
          </dl>
        </section>

        <section className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent" aria-hidden />
            <h2 className="eyebrow text-accent">What others can see</h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-[0.875rem] leading-[1.6] text-ink-2">
            <li className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              Your display name and grade label, if you set one.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
              Never your email address.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
              Never your school, and never your location.
            </li>
          </ul>
          <p className="mt-4 text-[0.75rem] leading-5 text-ink-3">
            Many NGN readers are minors. Anything that could identify a specific
            person and place is kept out of the product by design.
          </p>
        </section>
      </div>

      <section className="mt-12 rule-top pt-4">
        <h2 className="eyebrow text-ink-3">Saved stories</h2>
        <div className="mt-5">
          <SavedList candidates={articles.map(toSummary)} />
        </div>
      </section>
    </Container>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-3 last:border-0 last:pb-0">
      <dt className="text-[0.8125rem] text-ink-3">{label}</dt>
      <dd
        className={
          muted
            ? "text-[0.875rem] text-ink-3"
            : "text-[0.875rem] font-medium text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
