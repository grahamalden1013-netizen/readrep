import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <Container width="reading" className="py-10 sm:py-16">
      <Eyebrow tone="accent">Welcome to NGN</Eyebrow>
      <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
        Two questions, then you are in.
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-soft">
        No twenty-question survey. Pick a name, tell us what interests you, and
        the Arena is one tap away.
      </p>

      <div className="mt-12">
        <Onboarding />
      </div>
    </Container>
  );
}
