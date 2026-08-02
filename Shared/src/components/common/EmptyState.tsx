import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { ActionSpec } from "@shared/components/common/types";

interface EmptyStateProps {
  variant?: "default" | "search" | "error" | "firstRun";
  /** Override the illustration chosen by `variant`. */
  illustration?: IllustrationName;
  /** Fallback icon when no illustration is wanted (pass illustration={undefined} intent via icon). */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ActionSpec;
  secondaryAction?: ActionSpec;
  className?: string;
}

const VARIANT_ILLUSTRATION: Record<
  NonNullable<EmptyStateProps["variant"]>,
  IllustrationName
> = {
  default: "empty-directory",
  search: "empty-search",
  error: "error",
  firstRun: "first-run",
};

function ActionButton({
  spec,
  variant,
}: {
  spec: ActionSpec;
  variant: "default" | "outline";
}) {
  if (spec.to) {
    return (
      <Button asChild variant={variant}>
        <Link to={spec.to}>{spec.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={spec.onClick}>
      {spec.label}
    </Button>
  );
}

export function EmptyState({
  variant = "default",
  illustration,
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const illoName = illustration ?? (Icon ? null : VARIANT_ILLUSTRATION[variant]);

  return (
    <div
      role={variant === "search" ? "status" : undefined}
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center md:py-16",
        className,
      )}
    >
      {illoName ? (
        <Illustration name={illoName} className="mb-6 h-28" />
      ) : Icon ? (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted text-navy dark:text-white">
          <Icon className="h-8 w-8" />
        </div>
      ) : null}

      <h3 className="font-display text-lg font-semibold text-ink-strong">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && <ActionButton spec={action} variant="default" />}
          {secondaryAction && (
            <ActionButton spec={secondaryAction} variant="outline" />
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
