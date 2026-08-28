import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { IssueProfileQuiz } from "@/components/onboarding/IssueProfileQuiz";

export const metadata: Metadata = {
  title: "Issue Profile",
  description: "Optional, private, and never a label.",
};

export default function IssueProfilePage() {
  return (
    <Container width="reading" className="py-10 sm:py-16">
      <Eyebrow tone="accent">Optional</Eyebrow>
      <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">Your Issue Profile</h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-soft">
        Six statements. The result shows how closely your answers track each
        major party&apos;s platform, area by area — not a label, and not a
        recommendation.
      </p>

      <div className="mt-12">
        <IssueProfileQuiz />
      </div>
    </Container>
  );
}
