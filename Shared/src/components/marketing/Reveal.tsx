import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { useReveal } from "@shared/hooks/useReveal";

interface RevealProps {
  children: ReactNode;
  /** Stagger a list with `index * 80`. Keep the total under ~320ms. */
  delay?: number;
  className?: string;
}

/**
 * Fade + 12px rise on first scroll into view. Transform and opacity only, so
 * it can never cause layout shift. Under reduced motion `useReveal` reports
 * revealed on the first render and these classes are never applied.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, revealed } = useReveal();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Reveal;
