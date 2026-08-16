import { Eye, MessageCircle, Target } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { VideoPlayerDemo } from "@/components/ui/video-player";
import { Logo } from "@/components/logo";

const steps = [
  {
    icon: Eye,
    title: "Pause",
    body: "Film stops at the exact frame before the decision — not after the play resolves.",
  },
  {
    icon: Target,
    title: "Predict",
    body: "The player commits to a read before seeing what actually happened. No peeking ahead.",
  },
  {
    icon: MessageCircle,
    title: "Reveal & teach",
    body: "The real play plays out, scored against the prediction, with coaching feedback on the read.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-6 sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <LinkButton href="/login" variant="ghost" size="sm">
            Log in
          </LinkButton>
          <LinkButton href="/signup" size="sm">
            Get started
          </LinkButton>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-24 pt-10 sm:px-10">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="rr-animate-in flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1 text-[12px] font-medium text-muted-foreground">
              Built for youth &amp; AAU basketball
            </span>
            <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Turn game film into decision-making reps
            </h1>
            <p className="max-w-md text-[17px] leading-relaxed text-muted-foreground">
              ReadRep pauses film right before the decision. Players predict the
              read, see the real outcome, and get coaching feedback that
              actually sticks — instead of a comment they hear once and forget.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/signup" size="lg">
                Get started — it&apos;s free
              </LinkButton>
              <LinkButton href="/login" variant="secondary" size="lg">
                Log in
              </LinkButton>
            </div>
          </div>

          <div className="rr-animate-in [animation-delay:80ms]">
            <VideoPlayerDemo />
          </div>
        </div>

        <div className="mt-28 grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="rr-animate-in flex flex-col gap-3 rounded-lg border border-border bg-surface p-6"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                <step.icon className="size-4.5" aria-hidden="true" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">{step.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
