import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export function StudioDataPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "studio-data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      {children}
    </section>
  );
}

export default StudioDataPanel;
