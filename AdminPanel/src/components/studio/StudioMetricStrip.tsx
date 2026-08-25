import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export type StudioTone = "orange" | "cobalt" | "lime" | "navy";

const STUDIO_TONES: Record<StudioTone, { card: string; icon: string }> = {
  cobalt: { card: "border-[#dce8fa] bg-[#eef5ff]", icon: "text-[#4f7fc9]" },
  lime: { card: "border-[#d8eadf] bg-[#eef8f1]", icon: "text-[#4a9b6d]" },
  orange: { card: "border-[#f2ded2] bg-[#fff3ec]", icon: "text-[#d98255]" },
  navy: { card: "border-[#eee4bb] bg-[#fff9df]", icon: "text-[#b88a22]" },
};

export interface StudioMetricItem {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: StudioTone;
  onClick?: () => void;
  actionLabel?: string;
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
      {items.map(({ label, value, hint, icon: Icon, tone = "cobalt", onClick, actionLabel }) => (
        <article
          key={label}
          className={cn(
            "group relative min-h-36 overflow-hidden rounded-xl border p-5 shadow-soft",
            STUDIO_TONES[tone].card,
          )}
        >
          <Icon
            className={cn(
              "pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 stroke-[1.25] opacity-[0.11]",
              STUDIO_TONES[tone].icon,
            )}
            aria-hidden="true"
          />
          {onClick ? (
            <button
              type="button"
              aria-label={actionLabel ?? label}
              className="relative z-10 flex h-full w-full flex-col items-start text-left outline-none after:absolute after:-inset-5 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
              onClick={onClick}
            >
              <MetricContent label={label} value={value} hint={hint} />
            </button>
          ) : (
            <div className="relative z-10 flex h-full flex-col items-start">
              <MetricContent label={label} value={value} hint={hint} />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function MetricContent({ label, value, hint }: Pick<StudioMetricItem, "label" | "value" | "hint">) {
  return (
    <>
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <span className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-strong">{value}</span>
      {hint ? <span className="mt-auto pt-3 text-xs font-medium text-ink/60">{hint}</span> : null}
    </>
  );
}

export default StudioMetricStrip;
