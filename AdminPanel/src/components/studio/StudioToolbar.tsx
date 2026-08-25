import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export function StudioToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Page tools"
      className={cn(
        "studio-toolbar flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft",
        className,
      )}
    >
      {children}
    </section>
  );
}

export default StudioToolbar;
