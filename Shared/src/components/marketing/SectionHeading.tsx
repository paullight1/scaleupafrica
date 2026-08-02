import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Eyebrow } from "@shared/components/marketing/Eyebrow";
import type { Tone } from "@shared/components/marketing/types";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: Tone;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "center",
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "font-display text-3xl font-bold leading-tight md:text-4xl",
          dark ? "text-white" : "text-ink-strong",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed",
            dark ? "text-mk-ink-muted" : "text-muted-foreground",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
