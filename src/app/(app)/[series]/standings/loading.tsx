import { Skeleton } from "@/components/ui/skeleton";
import { StandingsListSkeleton } from "@/components/ui/skeletons";

export default function StandingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <StandingsListSkeleton rows={12} />
    </div>
  );
}
