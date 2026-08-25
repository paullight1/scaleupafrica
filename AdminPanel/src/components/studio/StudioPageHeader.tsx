import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { PageHeader } from "@shared/components/common/PageHeader";

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
  title,
  description,
  actions,
  className,
}: StudioPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      subtitle={description}
      actions={actions}
      className={cn("studio-page-header", className)}
    />
  );
}

export default StudioPageHeader;
