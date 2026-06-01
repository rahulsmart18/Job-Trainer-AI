export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="skeleton block h-3 w-24" />
        <span className="skeleton block h-8 w-64" />
        <span className="skeleton block h-4 w-80" />
      </div>
      <span className="skeleton block h-40 w-full rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <span className="skeleton block h-24 rounded-2xl" />
        <span className="skeleton block h-24 rounded-2xl" />
      </div>
    </div>
  );
}
