export default function NewsDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto pb-24 animate-pulse">
      <div className="px-4 pt-4">
        <div className="h-8 w-24 bg-muted rounded" />
      </div>

      {/* Hero image skeleton */}
      <div className="w-full aspect-video mt-3 bg-muted" />

      <div className="px-4 mt-4 flex flex-col gap-5">
        {/* Meta */}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-3 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>

        {/* Summary */}
        <div className="space-y-2 border-l-2 border-muted pl-3">
          <div className="h-3.5 w-full bg-muted rounded" />
          <div className="h-3.5 w-4/5 bg-muted rounded" />
        </div>

        {/* Body paragraphs */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
