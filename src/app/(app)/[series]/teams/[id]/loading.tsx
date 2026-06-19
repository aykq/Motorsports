import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton } from "@/components/ui/skeletons";

export default function TeamDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="px-4 pt-6">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="px-6 py-8">
        <div className="flex items-center gap-5">
          <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
      <div className="px-4 space-y-6">
        <StatCardsSkeleton cols={3} />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-card border border-border p-3 space-y-2">
                <Skeleton className="w-14 h-14 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
