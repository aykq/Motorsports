import { Skeleton } from "@/components/ui/skeleton";

export default function CircuitDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-8">
      <Skeleton className="h-5 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-card border border-border px-3 py-2.5 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
