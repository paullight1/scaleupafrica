import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import type { Tone } from "@shared/components/marketing/types";

interface EyebrowProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * Small uppercase label above a heading.
 *
 * NOT orange on light: `--primary` on white is 2.84:1 and `--primary-dark` is
 * 3.87:1, both below AA for text this size. Orange is reserved for the dark
 * tone, where it clears AA at 6.66:1 on `--mk-canvas`.
 */
export function Eyebrow({ tone = "light", className, children }: EyebrowProps) {
  return (
    <p
      className={cn(
        "mb-3 text-xs font-semibold uppercase tracking-[0.14em]",
        tone === "dark" ? "text-primary" : "text-navy",
        className,
      )}
    >
      {children}
    </p>
  );
}

export default Eyebrow;
