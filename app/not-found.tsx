import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5">
      <div className="w-full max-w-md text-center">
        <Logo className="justify-center" />
        <p className="eyebrow mt-10 text-ink-3">404</p>
        <h1 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-6 text-ink-2">
          The link may be out of date, or the story may have moved. Today&rsquo;s
          brief is the fastest way back in.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/today"
            className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/88"
          >
            Read today&rsquo;s brief
          </Link>
          <Link
            href="/search"
            className="inline-flex h-11 items-center rounded-full border border-hairline-strong px-5 text-[0.875rem] font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Search NGN
          </Link>
        </div>
      </div>
    </div>
  );
}
