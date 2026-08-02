import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { Tone } from "@shared/components/marketing/types";

interface SplitRowProps {
  illustration: IllustrationName;
  /** Set when the graphic carries meaning the copy doesn't already state. */
  illustrationTitle?: string;
  /** Puts the illustration on the left at md+. DOM order never changes. */
  reverse?: boolean;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * Illustration one side, copy the other. `reverse` swaps them with grid order
 * only — copy always precedes the graphic in the DOM, so screen readers and
 * mobile both get the meaningful content first.
 */
export function SplitRow({
  illustration,
  illustrationTitle,
  reverse = false,
  tone = "light",
  className,
  children,
}: SplitRowProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("grid items-center gap-10 md:grid-cols-2 md:gap-16", className)}>
      <div className={reverse ? "md:order-2" : undefined}>{children}</div>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl p-8",
          dark ? "bg-mk-surface" : "bg-surface-subtle",
          reverse ? "md:order-1" : undefined,
        )}
      >
        <Illustration
          name={illustration}
          title={illustrationTitle}
          tone={dark ? "dark" : "auto"}
          className="h-44 w-full max-w-sm md:h-56"
        />
      </div>
    </div>
  );
}

export default SplitRow;
