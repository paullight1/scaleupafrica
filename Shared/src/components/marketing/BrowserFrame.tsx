import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface BrowserFrameProps {
  /** Fake address-bar text, e.g. "cresciva.com/directory". */
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A browser shell around real product components rendered with static sample
 * data.
 *
 * The stage is INERT and aria-hidden on purpose: the sample rows do not
 * resolve to real routes, so letting a keyboard or screen-reader user activate
 * them would land on a 404. The section's own CTA is the real link.
 *
 * `inert` is set imperatively because React 18's JSX types don't include it.
 */
export function BrowserFrame({ label = "cresciva.com", className, children }: BrowserFrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stageRef.current?.setAttribute("inert", "");
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-elevated",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        ref={stageRef}
        data-preview-stage
        aria-hidden="true"
        className="pointer-events-none select-none bg-background p-5 sm:p-6"
      >
        {children}
      </div>
    </div>
  );
}

export default BrowserFrame;
