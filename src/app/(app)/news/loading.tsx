export default function NewsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="h-8 w-32 bg-muted rounded animate-pulse mb-4" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex bg-card border border-border rounded-xl overflow-hidden h-24 animate-pulse">
            <div className="w-1 bg-muted" />
            <div className="flex-1 p-3 flex gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
              <div className="w-20 h-16 bg-muted rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
