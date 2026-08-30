import type { Viewport } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { InteractiveProof } from "@/components/marketing/interactive-proof";
import { toPublicRep } from "@/lib/reps/public-rep";
import { DEMO_GAME, DEMO_GAME_ID, DEMO_REPS } from "@/lib/reps/seed";

export const viewport: Viewport = { themeColor: "#ffffff" };

const DEMO_HREF = `/games/${DEMO_GAME_ID}/processing`;

const STEPS = [
  {
    n: "01",
    title: "Upload your game",
    body: "Say which player you are. The decisions you were part of get marked on the film.",
  },
  {
    n: "02",
    title: "Make the read again",
    body: "The film pauses before the outcome. You commit to a choice before you are shown one.",
  },
  {
    n: "03",
    title: "Learn from the result",
    body: "See what actually happened, why the better option was better, and what to look for next.",
  },
];

const CONTRAST = [
  {
    label: "Watching film",
    lines: [
      "The play runs to its end.",
      "You already know the outcome.",
      "Agreeing with the tape feels like learning.",
    ],
  },
  {
    label: "Taking a rep",
    lines: [
      "The film stops one beat early.",
      "You have to commit to a read.",
      "Then the tape tells you if you were right.",
    ],
  },
];

export default function LandingPage() {
  // The hero shows rep 3; the interactive proof uses rep 1, so the page never
  // asks the same decision twice.
  const heroRep = DEMO_REPS[2];
  const proofRep = DEMO_REPS[0];
  const source = DEMO_GAME.video;

  if (!source) {
    throw new Error("The seeded demo game is missing its video source.");
  }

  // The hero frame seeks straight to the decision, so the poster (which is a
  // different moment in the film) would only flash the wrong play first.
  const heroSource = { ...source, posterSrc: undefined };

  return (
    <div className="is-document shell-marketing flex flex-1 flex-col">
      <SiteNav demoHref={DEMO_HREF} />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero: the claim on the left, the running product on the right.    */}
        {/* ---------------------------------------------------------------- */}
        <section className="page-shell py-8 lg:py-10">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
            <div>
              <p className="label-caps text-fg-faint">Basketball IQ training</p>

              <h1 className="display-1 mt-5 text-fg">
                See the read.
                <br />
                Make it again.
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-fg-soft">
                NextRep turns decisions from your actual game film into short,
                interactive reps&mdash;so you can recognize the better play
                before your next game.
              </p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <ButtonLink href="#for-players" size="lg">
                  Try a real rep
                </ButtonLink>
                <ButtonLink href="/games/new" variant="secondary" size="lg">
                  Upload game film
                </ButtonLink>
              </div>

              <p className="mt-5 text-[0.8125rem] text-fg-faint">
                Five decisions. About four minutes. No account needed.
              </p>
            </div>

            <HeroPreview
              rep={toPublicRep(heroRep)}
              source={heroSource}
              totalReps={DEMO_REPS.length}
              jerseyNumber={DEMO_GAME.identity.jerseyNumber}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* What a rep is, against what film review already is.               */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-line bg-surface">
          <div className="page-shell grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-14">
            <h2 className="display-2 max-w-sm text-fg">
              Film review is passive. A rep is not.
            </h2>

            <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
              {CONTRAST.map((column, index) => (
                <div key={column.label} className="bg-canvas p-5">
                  <p
                    className={`label-caps ${index === 1 ? "text-fg" : "text-fg-faint"}`}
                  >
                    {column.label}
                  </p>
                  <ul
                    className={`mt-4 flex flex-col gap-2.5 text-sm leading-relaxed ${
                      index === 1 ? "decision-mark text-fg" : "text-fg-soft"
                    }`}
                  >
                    {column.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works.                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="how-it-works"
          className="scroll-mt-14 border-t border-line"
        >
          <div className="page-shell py-12">
            <h2 className="display-2 text-fg">Your game becomes the workout</h2>

            <ol className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="bg-surface p-5">
                  <p className="timecode text-fg-faint">{step.n}</p>
                  <h3 className="display-3 mt-4 text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-soft">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The product itself, in the product's own room.                    */}
        {/* ---------------------------------------------------------------- */}
        <section id="for-players" className="shell-film scroll-mt-14 bg-canvas">
          <div className="page-shell py-12 lg:py-16">
            <InteractiveProof
              rep={toPublicRep(proofRep)}
              source={source}
              gameTitle="Saturday vs. Dragons — tactical demo"
              demoHref={DEMO_HREF}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Close.                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-line">
          <div className="page-shell flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="display-2 max-w-lg text-fg">
              Your mistakes become your next reps.
            </h2>
            <ButtonLink href={DEMO_HREF} size="lg">
              Try a demo session
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="page-shell flex flex-col gap-2 py-6 text-[0.8125rem] text-fg-faint sm:flex-row sm:items-center sm:justify-between">
          <p>NextRep</p>
          <p>Demo film is an animated re-creation, not real game footage.</p>
        </div>
      </footer>
    </div>
  );
}
