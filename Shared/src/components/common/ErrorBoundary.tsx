import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@shared/components/common/ErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Replaces the default panel. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  title?: string;
  message?: string;
  /**
   * Called on reset instead of a full page reload. Use it when the caller can
   * genuinely recover (remount a subtree, refetch a query) — without it the
   * same render would throw again immediately, so the default is a reload.
   */
  onReset?: () => void;
  /** Reporting hook (Sentry etc.). Must not throw. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time throws so one broken subtree degrades to a panel instead
 * of blanking the SPA. Error boundaries only catch during render/lifecycle —
 * event handlers and async rejections still need their own try/catch, and
 * query errors keep using ErrorState directly.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console -- the only signal we have in prod today
    console.error("ErrorBoundary caught:", error, info.componentStack);
    try {
      this.props.onError?.(error, info);
    } catch {
      /* reporting must never mask the original error */
    }
  }

  private reset = () => {
    const { onReset } = this.props;
    if (onReset) {
      this.setState({ error: null });
      onReset();
      return;
    }
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <ErrorState
        title={this.props.title ?? "This page hit a snag"}
        message={
          this.props.message ??
          "Something broke while rendering. Reloading usually clears it — if it keeps happening, let us know."
        }
        retryLabel={this.props.onReset ? "Try again" : "Reload page"}
        onRetry={this.reset}
      />
    );
  }
}

export default ErrorBoundary;
