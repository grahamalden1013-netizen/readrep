import type { Viewport } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { InteractiveProof } from "@/components/marketing/interactive-proof";
import { toPublicRep } from "@/lib/reps/public-rep";
import { DEMO_GAME, DEMO_GAME_ID, DEMO_REPS } from "@/lib/reps/seed";

// The public page is the one light surface in the product.
export const viewport: Viewport = { themeColor: "#f5f2ec" };

const DEMO_HREF = `/games/${DEMO_GAME_ID}/processing`;

const STEPS = [
  {
    n: "01",
    title: "Upload your game",
    body: "NextRep finds decisions involving you.",
  },
  {
    n: "02",
    title: "Make the read again",
    body: "The film pauses before the outcome.",
  },
  {
    n: "03",
    title: "Learn from the result",
    body: "See what happened and understand the better option.",
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
    <div className="surface-light flex flex-1 flex-col">
      <SiteNav demoHref={DEMO_HREF} />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero: copy left, the real product frame right.                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="label-caps text-court-deep">
                Basketball IQ training
              </p>

              <h1 className="mt-4 text-[2.25rem] leading-[0.95] font-semibold tracking-[-0.035em] text-graphite-950 uppercase sm:text-[3.25rem] lg:text-[3.75rem]">
                See the read.
                <br />
                Make it again.
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-graphite-700">
                NextRep turns decisions from your actual game film into short,
                interactive reps—so you can recognize the better play before
                your next game.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <ButtonLink href="#for-players" variant="court" size="lg">
                  Try a real rep
                </ButtonLink>
                <ButtonLink href="/games/new" variant="outline" size="lg">
                  Upload game film
                </ButtonLink>
              </div>

              <p className="mt-4 text-[0.8125rem] text-graphite-500">
                Five decisions. About four minutes.
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
        {/* One tight explanation row.                                        */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="how-it-works"
          className="border-t border-rule scroll-mt-14"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
            <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-graphite-950 uppercase sm:text-2xl">
              Your game becomes the workout
            </h2>

            <ol className="mt-7 grid gap-px overflow-hidden rounded-[4px] border border-rule bg-rule sm:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="bg-paper-card p-5">
                  <p className="font-mono text-xs text-court-deep">{step.n}</p>
                  <h3 className="mt-3 text-[0.9375rem] font-semibold tracking-[-0.01em] text-graphite-950">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite-700">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Interactive proof: the real loop, playable here.                  */}
        {/* ---------------------------------------------------------------- */}
        <section id="for-players" className="border-t border-rule scroll-mt-14">
          <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
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
        <section className="border-t border-rule">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h2 className="max-w-lg text-[1.5rem] leading-tight font-semibold tracking-[-0.025em] text-graphite-950 uppercase sm:text-[1.75rem]">
              Your mistakes become your next reps.
            </h2>
            <ButtonLink href={DEMO_HREF} variant="court" size="lg">
              Try a demo session
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[0.8125rem] text-graphite-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>NextRep</p>
          <p>Demo film is an animated re-creation, not real game footage.</p>
        </div>
      </footer>
    </div>
  );
}
