export default function DashboardLoading() {
  return (
    <div className="page-shell flex flex-col gap-8 py-8">
      <div className="h-28 border-b border-line" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 rounded-panel border border-line bg-surface" />
        <div className="h-40 rounded-panel border border-line bg-surface" />
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
