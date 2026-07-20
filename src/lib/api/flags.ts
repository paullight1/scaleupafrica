/**
 * Per-domain cutover flag. `VITE_API_DOMAINS` is a comma list (e.g.
 * `directory,profiles,subscriptions,funding`). Absent => every domain stays on the
 * legacy Supabase path, so the app runs with NO backend. Reverting a domain =
 * removing its token and rebuilding (FOUNDATION §8.3, plan 07 §6.2).
 */
export type ApiDomain = "directory" | "profiles" | "subscriptions" | "funding";

const enabled: ReadonlySet<string> = new Set(
  (import.meta.env.VITE_API_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** True when a domain's reads/writes should route through the NestJS API. */
export function useApiFor(domain: ApiDomain): boolean {
  return enabled.has(domain);
}
