import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export type StudioTone = "orange" | "cobalt" | "lime" | "navy";

export interface StudioMetricItem {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: StudioTone;
}

export function StudioMetricStrip({
  items,
  className,
}: {
  items: StudioMetricItem[];
  className?: string;
}) {
  return (
    <section
      aria-label="Page summary"
      className={cn("studio-metric-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {items.map(({ label, value, hint, icon: Icon }) => (
        <article key={label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Icon className="h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-ink-strong">{value}</p>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </article>
      ))}
    </section>
  );
}

export default StudioMetricStrip;
