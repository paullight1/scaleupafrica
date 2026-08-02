import { cn } from "@shared/lib/utils";
import type { Testimonial, Tone } from "@shared/components/marketing/types";

interface TestimonialsProps {
  items: Testimonial[];
  tone?: Tone;
  className?: string;
}

/** Renders `null` on an empty array — no invented quotes ever ship. */
export function Testimonials({ items, tone = "light", className }: TestimonialsProps) {
  if (items.length === 0) return null;
  const dark = tone === "dark";

  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {items.map((item) => (
        <figure
          key={`${item.name}-${item.role}`}
          className={cn(
            "flex h-full flex-col rounded-xl border p-7",
            dark ? "border-mk-border bg-mk-surface" : "border-border bg-card shadow-soft",
          )}
        >
          <blockquote
            className={cn(
              "flex-1 leading-relaxed",
              dark ? "text-mk-ink-muted" : "text-foreground/80",
            )}
          >
            “{item.quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt=""
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-primary-foreground">
                {item.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span>
              <span
                className={cn(
                  "block text-sm font-semibold",
                  dark ? "text-white" : "text-ink-strong",
                )}
              >
                {item.name}
              </span>
              <span
                className={cn("block text-xs", dark ? "text-mk-ink-muted" : "text-muted-foreground")}
              >
                {item.role}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default Testimonials;
