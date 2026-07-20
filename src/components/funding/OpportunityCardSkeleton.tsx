import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Matches the OpportunityCard layout. No shimmer under prefers-reduced-motion. */
function Bone({ className }: { className?: string }) {
  return <Skeleton className={cn("motion-reduce:animate-none", className)} />;
}

export function OpportunityCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="w-full">
          <Bone className="mb-2 h-4 w-20" />
          <Bone className="mb-2 h-6 w-3/4" />
          <Bone className="h-4 w-1/3" />
        </div>
        <Bone className="h-6 w-24 rounded-full" />
      </div>
      <Bone className="mb-2 h-4 w-full" />
      <Bone className="mb-4 h-4 w-5/6" />
      <div className="mb-4 flex gap-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-4 w-28" />
      </div>
      <Bone className="h-8 w-28 rounded-lg" />
    </div>
  );
}

export function OpportunityCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="grid gap-6">
      <span className="sr-only">Curating funding opportunities…</span>
      {Array.from({ length: count }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default OpportunityCardSkeleton;
