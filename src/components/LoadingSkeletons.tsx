import { cn } from "@/lib/utils";

interface DashboardSkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} />
);

export const DashboardSkeleton = ({ className }: DashboardSkeletonProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Skeleton */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-6">
        {/* Tab Navigation Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>

        {/* Call Status Card Skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Check-in Log Skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EldersListSkeleton = ({ className }: DashboardSkeletonProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-12 mt-2" />
          </div>
        ))}
      </div>

      {/* Elder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 flex-1 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HealthBookSkeleton = ({ className }: DashboardSkeletonProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>

        {/* Stats Skeleton */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-3 w-3 rounded-full mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
