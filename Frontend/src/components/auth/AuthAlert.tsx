import type { FriendlyError } from "@/lib/authErrors";

/**
 * The single error surface for every auth screen.
 *
 * The live region is always mounted — mounting it *with* the error means screen
 * readers see a new region rather than a changed one and often stay silent.
 */
export function AuthAlert({ error }: { error: FriendlyError | null }) {
  return (
    <div aria-live="polite">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-left text-sm text-destructive-strong"
        >
          <p className="font-semibold">{error.title}</p>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
}
