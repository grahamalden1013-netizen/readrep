import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span aria-hidden className="block h-px w-10 bg-lime-deep" />
      <p className="eyebrow mt-6 text-ink-mute">404</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
        That page does not exist.
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-mute">
        It may have moved, or the link may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-sm font-medium text-ink-inverse transition-colors hover:bg-ink-soft"
        >
          Back to NGN
        </Link>
        <Link
          href="/arena"
          className="inline-flex h-11 items-center rounded-sm border border-rule-strong px-5 text-sm font-medium transition-colors hover:border-ink"
        >
          Enter the Arena
        </Link>
      </div>
    </div>
  );
}
