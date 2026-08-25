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
      {items.map(({ label, value, hint, icon: Icon, tone = "navy" }) => (
        <article key={label} className={cn("studio-metric", `studio-metric--${tone}`)}>
          <div className="studio-metric-icon" aria-hidden="true">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-current/70">
              {label}
            </p>
            <p className="studio-metric-value mt-1">{value}</p>
            {hint && <p className="mt-1 truncate text-xs text-current/70">{hint}</p>}
          </div>
        </article>
      ))}
    </section>
  );
}

export default StudioMetricStrip;
