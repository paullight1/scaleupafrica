/**
 * Slugify + collision suffix. Mirrors the DB trigger tg_profiles_set_slug()
 * (20260720130000): lowercase, strip diacritics best-effort, non-alnum -> '-',
 * trim, reserve 'create' (static route), fall back to 'business'.
 *
 * NOTE: in production the DB trigger owns slug assignment (immutable once set), so
 * upsert never sends `slug`. This helper exists for parity / potential API-side
 * pre-generation and is unit-tested (plan 07 §9.3).
 */
export function slugify(input: string): string {
  const base = String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base === "" || base === "create") return "business";
  return base;
}

/** Deterministic collision suffix from a UUID (matches trigger's substr strategy). */
export function withCollisionSuffix(base: string, id: string, attempt: number): string {
  const compact = id.replace(/-/g, "");
  return `${base}-${compact.slice(0, 4 + attempt)}`;
}
