import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/weekly", label: "Weekly" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?redirectTo=%2Fadmin");

  if (viewer.role !== "editor") {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper px-5">
        <div className="max-w-md rounded-[var(--radius-card)] border border-hairline bg-surface p-8 text-center shadow-card">
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3">
            <Lock className="size-4" aria-hidden />
          </span>
          <h1 className="mt-5 text-[1.25rem] font-semibold tracking-tight text-ink">
            Newsroom access required
          </h1>
          <p className="mt-2.5 text-[0.875rem] leading-6 text-ink-2">
            You are signed in as a reader. The newsroom is limited to editors.
            In this demo build you can start an editor session from the sign-in
            page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to NGN</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?redirectTo=%2Fadmin">Switch session</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="solid" size="md">
              Newsroom
            </Badge>
          </div>

          <nav aria-label="Newsroom" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-full px-3.5 py-2 text-[0.875rem] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-[0.8125rem] text-ink-3 transition-colors hover:text-ink sm:block"
            >
              View site
            </Link>
            <Button asChild size="sm">
              <Link href="/admin/stories/new">
                <Plus className="size-4" />
                New story
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>
    </div>
  );
}
