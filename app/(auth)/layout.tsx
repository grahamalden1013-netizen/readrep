import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Logo showFullName />
          <Link
            href="/"
            className="text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
          >
            Back to NGN
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-12 sm:px-8 sm:py-16">
        {children}
      </main>
    </div>
  );
}
