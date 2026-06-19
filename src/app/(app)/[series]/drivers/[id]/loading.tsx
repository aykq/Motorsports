import { Skeleton } from "@/components/ui/skeleton";
import { DriverHeroSkeleton, StatCardsSkeleton } from "@/components/ui/skeletons";

export default function DriverDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="px-4 pt-6">
        <Skeleton className="h-5 w-24" />
      </div>
      <DriverHeroSkeleton />
      <div className="px-4 space-y-6">
        <StatCardsSkeleton cols={3} />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border">
                <Skeleton className="w-10 h-5 shrink-0 rounded" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-12 h-3 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
