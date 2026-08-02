import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import type { Tone } from "@shared/components/marketing/types";

const TONE_CLASS: Record<Tone, string> = {
  light: "bg-background text-foreground",
  tinted: "bg-surface-subtle text-foreground",
  dark: "bg-mk-canvas text-mk-ink-muted",
};

interface SectionProps {
  tone?: Tone;
  id?: string;
  className?: string;
  /** Applied to the inner max-width container, not the full-bleed band. */
  containerClassName?: string;
  children: ReactNode;
}

/**
 * Owns every landing band's tone, vertical rhythm, max-width and gutter, so no
 * page hand-rolls padding. Full-bleed background, constrained content.
 */
export function Section({
  tone = "light",
  id,
  className,
  containerClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn("py-20 md:py-28", TONE_CLASS[tone], className)}>
      <div className={cn("mx-auto max-w-7xl px-6 lg:px-8", containerClassName)}>{children}</div>
    </section>
  );
}

export default Section;
