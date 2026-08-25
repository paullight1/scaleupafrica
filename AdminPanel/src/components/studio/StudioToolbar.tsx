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
    <section aria-label="Page tools" className={cn("studio-toolbar", className)}>
      {children}
    </section>
  );
}

export default StudioToolbar;
