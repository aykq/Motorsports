import { Skeleton } from "@/components/ui/skeleton";
import { TeamListItemSkeleton } from "@/components/ui/skeletons";

export default function TeamsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <TeamListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
