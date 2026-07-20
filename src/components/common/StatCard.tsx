import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: LucideIcon;
  hint?: string;
  loading?: boolean;
  className?: string;
}

const DELTA_STYLE = {
  up: { icon: ArrowUpRight, className: "text-success-strong" },
  down: { icon: ArrowDownRight, className: "text-destructive-strong" },
  flat: { icon: Minus, className: "text-muted-foreground" },
} as const;

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  loading = false,
  className,
}: StatCardProps) {
  const deltaStyle = delta ? DELTA_STYLE[delta.direction] : null;
  const DeltaIcon = deltaStyle?.icon;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />}
      </div>

      {loading ? (
        <Skeleton className="mt-2 h-8 w-24 motion-reduce:animate-none" />
      ) : (
        <p className="mt-2 font-display text-3xl font-bold text-ink-strong">{value}</p>
      )}

      {(delta || hint) && !loading && (
        <div className="mt-2 flex items-center gap-2">
          {delta && DeltaIcon && (
            <span
              className={cn("inline-flex items-center gap-1 text-sm font-medium", deltaStyle?.className)}
            >
              <DeltaIcon className="h-4 w-4" aria-hidden="true" />
              {delta.value}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
