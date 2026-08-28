"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Container } from "@/components/ui/primitives";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ngn] route error:", error);
  }, [error]);

  return (
    <Container width="reading" className="py-20 text-center">
      <span aria-hidden className="mx-auto block h-px w-10 bg-lime-deep" />
      <h1 className="mt-6 text-3xl">Something broke on our side.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-mute">
        Your debate progress is stored on this device, so nothing you have
        written is lost. Try again, or head back to the Arena.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/arena" tone="secondary">
          Back to the Arena
        </ButtonLink>
      </div>
    </Container>
  );
}
