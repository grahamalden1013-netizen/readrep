import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { RepPreview } from "@/components/marketing/rep-preview";
import { DEMO_GAME_ID } from "@/lib/reps/seed";

const STEPS = [
  {
    n: "01",
    title: "Upload your game",
    body: "Drop in a full game file and tell us who you are — team color and jersey number.",
  },
  {
    n: "02",
    title: "Make the read again",
    body: "The film stops a beat before each decision. You choose before you see what happened.",
  },
  {
    n: "03",
    title: "Train what you missed",
    body: "Every rep ends with what you actually did, the better read, and one thing to carry into Friday.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Wordmark />
          <ButtonLink href={`/games/${DEMO_GAME_ID}/processing`} variant="secondary">
            Try a demo session
          </ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-6 pt-20 pb-14 sm:pt-28">
          <h1 className="max-w-3xl text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-ink-50 sm:text-6xl">
            Turn your game film into reps.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-300">
            NextRep pauses your own game a beat before a decision and asks you to make the read
            again. Five reps, four minutes, from film you already have.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/games/${DEMO_GAME_ID}/processing`} size="lg">
              Try a demo session
            </ButtonLink>
            <ButtonLink href="/games/new" variant="secondary" size="lg">
              Upload a game
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-ink-500">No account needed for the demo.</p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <RepPreview />
        </section>

        <section className="border-t border-ink-800">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="label-caps text-lime-accent">{step.n}</p>
                <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink-50">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-ink-800">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-50">
                Take five reps from Saturday.
              </h2>
              <p className="mt-2 text-sm text-ink-400">
                The demo runs on a seeded game so you can see the whole loop end to end.
              </p>
            </div>
            <ButtonLink href={`/games/${DEMO_GAME_ID}/processing`} size="lg">
              Start the demo
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-800">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>NextRep</p>
          <p>
            Demo film is an animated re-creation.{" "}
            <Link href="/dashboard" className="text-ink-300 underline underline-offset-4">
              Go to dashboard
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
