import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { Tone } from "@shared/components/marketing/types";

interface IllustratedCardProps {
  illustration: IllustrationName;
  title: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * The illustration-first card primitive. The graphic is the card's first
 * element and sits in a tinted well, so a section built from these can never
 * degrade into a wall of text.
 */
export function IllustratedCard({
  illustration,
  title,
  tone = "light",
  className,
  children,
}: IllustratedCardProps) {
  const dark = tone === "dark";
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border p-8 transition-all",
        dark
          ? "border-mk-border bg-mk-surface hover:border-primary/40 hover:bg-mk-raised"
          : "border-border bg-card shadow-soft hover:border-primary/40 hover:shadow-medium",
        className,
      )}
    >
      <div
        className={cn(
          "mb-6 flex h-32 items-center justify-center rounded-lg",
          dark ? "bg-mk-raised" : "bg-surface-subtle",
        )}
      >
        <Illustration name={illustration} tone={dark ? "dark" : "auto"} className="h-24" />
      </div>
      <h3
        className={cn(
          "mb-3 font-display text-xl font-semibold",
          dark ? "text-white" : "text-ink-strong",
        )}
      >
        {title}
      </h3>
      <div className={cn("leading-relaxed", dark ? "text-mk-ink-muted" : "text-muted-foreground")}>
        {children}
      </div>
    </article>
  );
}

export default IllustratedCard;
