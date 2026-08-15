import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        ReadRep
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Turn game film into decision-making reps
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        ReadRep pauses your players&apos; film right before the decision. They
        predict what they should do, see what actually happened, and get
        coaching feedback that sticks.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/signup"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-background font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-8 font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Log in
        </Link>
      </div>

      <dl className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-8 text-left sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Pause</dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Film stops right at the decision point, before the play unfolds.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Predict</dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Players choose what they&apos;d do next, before seeing the outcome.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Reveal</dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            The real play plays out, with coaching feedback on the read.
          </dd>
        </div>
      </dl>
    </div>
  );
}
