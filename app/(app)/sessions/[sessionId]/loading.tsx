export default function SessionLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
      <div className="h-4 w-32 rounded bg-ink-850" />
      <div className="aspect-video w-full rounded-panel border border-ink-800 bg-ink-900" />
      <div className="h-6 w-2/3 rounded bg-ink-850" />
      <span className="sr-only">Loading session</span>
    </div>
  );
}
