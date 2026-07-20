import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton that stops pulsing under prefers-reduced-motion. */
function Bone({ className }: { className?: string }) {
  return <Skeleton className={cn("motion-reduce:animate-none", className)} />;
}

function StatusWrap({
  children,
  label = "Loading…",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <StatusWrap label={label} className={cn("space-y-3", className)}>
      <Bone className="h-4 w-2/3" />
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-5/6" />
    </StatusWrap>
  );
}

export function CardSkeleton({
  media = false,
  lines = 3,
  className,
}: {
  media?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 shadow-soft", className)}>
      {media && <Bone className="mb-4 h-32 w-full rounded-lg" />}
      <Bone className="mb-3 h-5 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className={cn("mb-2 h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function ListSkeleton({
  count = 6,
  media,
  lines,
  className,
}: {
  count?: number;
  media?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <StatusWrap
      className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} media={media} lines={lines} />
      ))}
    </StatusWrap>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <StatusWrap
      className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}
    >
      <div className="divide-y divide-border">
        <div
          className="grid gap-4 bg-surface-muted p-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Bone key={c} className="h-4 w-3/4" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 p-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Bone key={c} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}

export function DashboardSkeleton() {
  return (
    <StatusWrap className="space-y-8">
      <div className="space-y-3">
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <Bone className="mb-3 h-4 w-24" />
            <Bone className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </StatusWrap>
  );
}

export default LoadingState;
