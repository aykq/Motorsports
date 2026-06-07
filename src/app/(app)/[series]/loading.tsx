import { Skeleton } from "@/components/ui/skeleton";
import { SeriesHeroSkeleton, DriverCardSkeleton, StandingsListSkeleton } from "@/components/ui/skeletons";

export default function SeriesLoading() {
  return (
    <div className="pb-24">
      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-2 -ml-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <SeriesHeroSkeleton />
        <div>
          <Skeleton className="h-3 w-16 mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <DriverCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-9 w-full rounded-lg mb-3" />
          <StandingsListSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
