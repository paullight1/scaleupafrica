import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * `flags.ts` reads VITE_API_DOMAINS once at module load, so each case stubs the env
 * and re-imports with a fresh module registry.
 */
async function loadFlags(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) vi.stubEnv("VITE_API_DOMAINS", "");
  else vi.stubEnv("VITE_API_DOMAINS", value);
  return import("../flags");
}

afterEach(() => vi.unstubAllEnvs());

describe("useApiFor", () => {
  it("returns false for every domain when the flag is unset (legacy Supabase path)", async () => {
    const { useApiFor } = await loadFlags(undefined);
    expect(useApiFor("directory")).toBe(false);
    expect(useApiFor("profiles")).toBe(false);
    expect(useApiFor("subscriptions")).toBe(false);
    expect(useApiFor("funding")).toBe(false);
  });

  it("enables only the listed domains", async () => {
    const { useApiFor } = await loadFlags("directory, funding");
    expect(useApiFor("directory")).toBe(true);
    expect(useApiFor("funding")).toBe(true);
    expect(useApiFor("profiles")).toBe(false);
    expect(useApiFor("subscriptions")).toBe(false);
  });

  it("is case-insensitive and trims whitespace", async () => {
    const { useApiFor } = await loadFlags("  Profiles ,SUBSCRIPTIONS ");
    expect(useApiFor("profiles")).toBe(true);
    expect(useApiFor("subscriptions")).toBe(true);
  });
});
