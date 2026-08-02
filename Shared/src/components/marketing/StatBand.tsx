import { cn } from "@shared/lib/utils";
import type { Stat, Tone } from "@shared/components/marketing/types";

interface StatBandProps {
  stats: Stat[];
  tone?: Tone;
  className?: string;
}

/**
 * Renders `null` on an empty array. The homepage ships with no stats — the
 * section map is composed to look complete without them, and inventing
 * numbers for a funding platform is not an option.
 */
export function StatBand({ stats, tone = "light", className }: StatBandProps) {
  if (stats.length === 0) return null;
  const dark = tone === "dark";

  return (
    <dl className={cn("grid grid-cols-2 gap-8 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        // flex-col-reverse puts the numeral on top visually while keeping the
        // dt-before-dd order the spec requires — no sr-only duplicate label.
        <div key={stat.label} className="flex flex-col-reverse text-center">
          <dt
            className={cn("mt-2 text-sm", dark ? "text-mk-ink-muted" : "text-muted-foreground")}
          >
            {stat.label}
          </dt>
          <dd
            className={cn(
              "font-display text-4xl font-bold md:text-5xl",
              dark ? "text-primary" : "text-primary-dark",
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default StatBand;
