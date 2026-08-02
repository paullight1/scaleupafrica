import { useEffect } from "react";

/**
 * Warn before losing unsaved form changes.
 *
 * This app uses `BrowserRouter` (not a data router), so React Router's `useBlocker` is
 * unavailable. We cover the two escape hatches:
 *   (a) tab close / refresh / external nav — the `beforeunload` listener wired here;
 *   (b) in-app navigation — the caller routes its Cancel/Back links through an AlertDialog
 *       while `isDirty` is true (see CreateProfile).
 *
 * TODO: upgrade to `useBlocker` if/when the app moves to `createBrowserRouter`.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers to trigger the native confirm dialog.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

export default useUnsavedChanges;
