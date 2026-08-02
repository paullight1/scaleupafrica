/**
 * Sign-out cleanup registry.
 *
 * Shared `useAuth` owns the sign-out call but must not know about any one app's
 * feature caches (funding results, drafts, …). Apps register their own teardown
 * at startup instead, so the dependency points app -> shared, never the reverse.
 *
 * Handlers run after `supabase.auth.signOut()` resolves. Each is wrapped so one
 * throwing handler can't strand the others — sign-out must always complete.
 */

type SignOutHandler = () => void;

const handlers = new Set<SignOutHandler>();

/** Register a teardown to run on sign-out. Returns an unsubscribe fn. */
export function onSignOut(handler: SignOutHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Run every registered teardown. Called by `useAuth`'s signOut — not by apps. */
export function runSignOutCleanup(): void {
  for (const handler of handlers) {
    try {
      handler();
    } catch {
      /* one bad handler must not block the rest of sign-out */
    }
  }
}
