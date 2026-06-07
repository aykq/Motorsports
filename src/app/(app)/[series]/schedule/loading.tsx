import { Skeleton } from "@/components/ui/skeleton";
import { TimelineItemSkeleton } from "@/components/ui/skeletons";

export default function ScheduleLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="pl-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <TimelineItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
