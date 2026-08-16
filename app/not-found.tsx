import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        <Compass className="size-5.5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[16px] font-semibold text-foreground">Page not found</p>
        <p className="mt-1 max-w-sm text-[13.5px] text-muted-foreground">
          That page doesn&apos;t exist, or it moved somewhere else.
        </p>
      </div>
      <LinkButton href="/" variant="secondary" size="sm">
        Back home
      </LinkButton>
    </div>
  );
}
