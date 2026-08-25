import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export type StudioAccent = "orange" | "cobalt" | "lime" | "navy";

interface StudioPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  accent?: StudioAccent;
  className?: string;
}

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  actions,
  accent = "orange",
  className,
}: StudioPageHeaderProps) {
  return (
    <header
      className={cn(
        "studio-page-header flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-4xl">
        <p className="studio-kicker">{eyebrow}</p>
        <h1 className="studio-title mt-2">{title}</h1>
        <span
          aria-hidden="true"
          className={cn("studio-title-stroke", `studio-title-stroke--${accent}`)}
        />
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

export default StudioPageHeader;
