import { Skeleton } from "@/components/ui/skeleton";
import { RaceCardSkeleton } from "@/components/ui/skeletons";

export default function CalendarLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-36 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <RaceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
