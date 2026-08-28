import Link from "next/link";
import { Logo } from "@/components/shell/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="border-t border-rule px-4 py-6 text-center">
        <p className="text-xs text-ink-faint">
          NGN judges how you argue, never what you argue for.{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to NGN
          </Link>
        </p>
      </footer>
    </div>
  );
}
