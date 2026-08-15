import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
          Watch. Predict. Improve.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          ReadRep turns game film into a training tool. Pause at the decision
          point, predict what happens next, then see how you did.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
