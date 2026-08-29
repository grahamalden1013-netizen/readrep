export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="h-40 rounded-panel border border-ink-800 bg-ink-900" />
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="h-32 rounded-panel border border-ink-800 bg-ink-900" />
        <div className="h-32 rounded-panel border border-ink-800 bg-ink-900" />
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
