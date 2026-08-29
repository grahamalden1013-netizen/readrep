import { ButtonLink } from "@/components/ui/button";

/**
 * Scoped to the app segment so it renders inside the app shell rather than
 * stacking a second header under the root layout's one.
 */
export default function AppNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-50">Nothing here</h1>
      <p className="max-w-prose text-sm leading-relaxed text-ink-400">
        That page or session does not exist. Sessions are kept on this device, so a link opened
        somewhere else will not find one.
      </p>
      <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
    </div>
  );
}
