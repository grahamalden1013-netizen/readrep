export default function SessionLoading() {
  return (
    <div className="page-shell flex flex-col gap-5 py-6 sm:py-8">
      <div className="h-4 w-32 rounded-xs bg-raised" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className="aspect-video w-full rounded-frame border border-line bg-surface" />
        <div className="h-40 rounded-panel border border-line bg-surface" />
      </div>
      <span className="sr-only">Loading session</span>
    </div>
  );
}
