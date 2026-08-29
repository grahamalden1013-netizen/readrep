import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
          <Wordmark />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-6 py-20">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Nothing here</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-400">
          That page or session does not exist. Sessions are kept on this device, so an old link can
          expire.
        </p>
        <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}
