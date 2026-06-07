import { Skeleton } from "@/components/ui/skeleton";
import { RaceDetailHeroSkeleton, WeatherSkeleton, SessionResultsSkeleton } from "@/components/ui/skeletons";

export default function RaceDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <RaceDetailHeroSkeleton />
      <Skeleton className="h-11 w-full rounded-xl" />
      <SessionResultsSkeleton rows={10} />
      <WeatherSkeleton />
    </div>
  );
}
