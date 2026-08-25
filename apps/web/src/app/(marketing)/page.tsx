import Link from "next/link";

/**
 * The public site.
 *
 * States what the product does and what it does not do, and is explicit about
 * privacy because the first question a parent asks is where their kid's film
 * goes. No product screenshots are shown, because there is no processed footage
 * to screenshot and a mock-up would misrepresent what exists.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-ink-800 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold tracking-tight">ReadRep</span>
          <Link
            href="/sign-in"
            className="text-chalk-400 hover:text-chalk-50 text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="text-court-400 text-xs font-semibold uppercase tracking-[0.12em]">
            Decision training from real game film
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Make the read again — before you see what happened.
          </h1>
          <p className="text-chalk-400 mt-5 max-w-xl text-lg leading-relaxed">
            ReadRep stops your own game film at the moment a decision was there to be
            made. You commit to a read, then you see the play, then you learn the cue to
            recognise next time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="bg-court-500 text-ink-950 hover:bg-court-400 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
            >
              Sign in
            </Link>
            <a
              href="#how"
              className="border-ink-600 text-chalk-200 hover:border-ink-500 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
            >
              How it works
            </a>
          </div>
        </section>

        <section id="how" className="border-ink-800 bg-ink-850 border-t">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-chalk-500 text-xs font-semibold uppercase tracking-[0.08em]">
              One repetition
            </h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Pause", "The clip stops before the answer is obvious."],
                ["Decide", "You commit to a read. No skipping ahead."],
                ["Reveal", "The play continues, once your answer is recorded."],
                ["Learn", "The cue, the options, and your coach's rule."],
                ["Reflect", "Say what you missed. Flag it to see again."],
              ].map(([title, detail], i) => (
                <li key={title}>
                  <span className="text-court-400 font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-semibold tracking-tight">{title}</h3>
                  <p className="text-chalk-400 mt-1 text-sm leading-relaxed">
                    {detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-ink-800 border-t">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:grid-cols-2">
            <div>
              <h2 className="text-chalk-500 text-xs font-semibold uppercase tracking-[0.08em]">
                Your coach is the authority
              </h2>
              <p className="text-chalk-400 mt-3 text-sm leading-relaxed">
                Nothing reaches a player until a coach approves it. Every explanation
                cites the coach&apos;s own rule, and where no rule covers the situation,
                ReadRep says so rather than inventing one.
              </p>
              <p className="text-chalk-400 mt-3 text-sm leading-relaxed">
                A good decision can miss and a poor one can go in. ReadRep grades the
                read and records the result separately, and never tells a player they
                were simply wrong.
              </p>
            </div>
            <div>
              <h2 className="text-chalk-500 text-xs font-semibold uppercase tracking-[0.08em]">
                Private by default
              </h2>
              <p className="text-chalk-400 mt-3 text-sm leading-relaxed">
                ReadRep handles game video of minors. Teams, games, clips, and profiles
                are private unless a consent record and an access grant say otherwise.
                There are no public rankings and no public clips — those are not
                features we have chosen to leave out for now, they are not built and
                will not be.
              </p>
              <p className="text-chalk-400 mt-3 text-sm leading-relaxed">
                Access is checked on the server for every read. Guardians control
                consent for their own player, and it can be withdrawn.
              </p>
            </div>
          </div>
        </section>

        <section className="border-ink-800 bg-ink-850 border-t">
          <div className="mx-auto max-w-5xl px-5 py-12">
            <p className="text-chalk-400 text-sm leading-relaxed">
              <span className="text-chalk-50 font-semibold">
                Where this build actually is.
              </span>{" "}
              This is a Phase 0 foundation. The learning loop works end to end against
              manually authored moments. Video upload, playback, player tracking, and
              automated analysis are specified and interfaced but not implemented — no
              footage is processed and no model is called. Nothing here pretends
              otherwise.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-ink-800 border-t">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <p className="text-chalk-500 text-xs">
            ReadRep · Private by default · Not for public distribution
          </p>
        </div>
      </footer>
    </div>
  );
}
