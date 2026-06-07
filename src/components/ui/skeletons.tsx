import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RaceCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 space-y-2.5", className)}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SeriesHeroSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-48 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-28 rounded" />
        <Skeleton className="h-7 w-20 rounded" />
      </div>
    </div>
  );
}

export function DriverCardSkeleton() {
  return (
    <div className="shrink-0 w-36 rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="px-2 pb-2 pt-1 space-y-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function StandingsRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
      <Skeleton className="w-7 h-4 shrink-0" />
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="w-12 h-4 shrink-0" />
    </div>
  );
}

export function StandingsListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <StandingsRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function TimelineItemSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center gap-1">
        <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
        <Skeleton className="w-px flex-1 min-h-8" />
      </div>
      <div className="flex-1 space-y-2 pb-4">
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function RaceDetailHeroSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-card border border-border p-3 space-y-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionResultsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
          <Skeleton className="w-6 h-4 shrink-0" />
          <Skeleton className="w-6 h-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="w-16 h-3.5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-2.5 flex flex-col items-center gap-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
