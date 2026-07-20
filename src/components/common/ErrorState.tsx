import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/common/Illustration";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** REQUIRED — fetch errors must always offer a retry (IMPROVEMENTS §2.1). */
  onRetry: () => void;
  retryLabel?: string;
  /** true = inline row (admin tables); false = full panel with illustration. */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-strong" />
          <div>
            <p className="text-sm font-semibold text-ink-strong">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button variant="default" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> {retryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center md:py-16",
        className,
      )}
    >
      <Illustration name="error" className="mb-6 h-28" />
      <h3 className="font-display text-lg font-semibold text-ink-strong">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="default" className="mt-6" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" /> {retryLabel}
      </Button>
    </div>
  );
}

export default ErrorState;
