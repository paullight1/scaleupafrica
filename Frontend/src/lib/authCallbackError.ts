import { useEffect, useState } from "react";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";

/**
 * Reads an auth-provider failure off the callback URL.
 *
 * When Supabase can't complete an OAuth or magic-link round trip it redirects
 * back to the app carrying `error` / `error_code` / `error_description` — on the
 * **query string** for the PKCE flow and on the **hash fragment** for the
 * implicit one. Both have to be checked: supabase-js consumes the hash for
 * successful sign-ins but leaves failures behind untouched, so a page that only
 * looks at `useSearchParams()` shows a blank sign-in form after a failed
 * consent screen and the user has no idea what happened.
 */
export function readCallbackError(search: string, hash: string): FriendlyError | null {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));

  const pick = (key: string) => query.get(key) ?? fragment.get(key);

  const code = pick("error_code");
  const error = pick("error");
  if (!code && !error) return null;

  const description = pick("error_description") ?? "";
  // `error_description` is URL-encoded prose from GoTrue — never render it raw;
  // it goes through mapAuthError purely as a matching hint.
  return mapAuthError({ code: code ?? error, message: description.replace(/\+/g, " ") });
}

/** True when the URL carries provider error params (in query or hash). */
function hasCallbackError(search: string, hash: string): boolean {
  return readCallbackError(search, hash) !== null;
}

/**
 * Surfaces a provider failure once, then scrubs it from the address bar so a
 * refresh (or a later successful attempt) doesn't resurrect a stale alert.
 * Uses history.replaceState rather than navigate() so it never re-runs the
 * router's effects mid-render.
 */
export function useCallbackError(): FriendlyError | null {
  const [error, setError] = useState<FriendlyError | null>(null);

  useEffect(() => {
    const { search, hash, pathname } = window.location;
    if (!hasCallbackError(search, hash)) return;

    setError(readCallbackError(search, hash));

    const query = new URLSearchParams(search.replace(/^\?/, ""));
    for (const key of ["error", "error_code", "error_description"]) query.delete(key);
    const cleanedSearch = query.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`
    );
  }, []);

  return error;
}
