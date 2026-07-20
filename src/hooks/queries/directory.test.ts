import { describe, it, expect } from "vitest";
import {
  sanitizeTerm,
  buildDirectoryQuery,
  directoryNextPageParam,
  PAGE_SIZE,
  type DirectoryPage,
} from "@/hooks/queries/directory";

/** Chainable spy that records .eq()/.or() calls and returns itself. */
function makeQuerySpy() {
  const calls: { method: string; args: unknown[] }[] = [];
  const spy: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of ["eq", "or"]) {
    spy[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return spy;
    };
  }
  return { spy, calls };
}

describe("sanitizeTerm", () => {
  it("strips PostgREST or() delimiters , ( )", () => {
    expect(sanitizeTerm("shea, butter (export)")).toBe("shea butter export");
  });

  it("escapes ilike wildcards % and _", () => {
    expect(sanitizeTerm("50%_off")).toBe("50\\%\\_off");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeTerm("  a   b  ")).toBe("a b");
  });
});

describe("buildDirectoryQuery", () => {
  it("always filters status = active", () => {
    const { spy, calls } = makeQuerySpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildDirectoryQuery(spy as any, { q: "", country: null, sector: null });
    expect(calls[0]).toEqual({ method: "eq", args: ["status", "active"] });
  });

  it("applies country and sector equality filters", () => {
    const { spy, calls } = makeQuerySpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildDirectoryQuery(spy as any, { q: "", country: "Kenya", sector: "Fintech" });
    expect(calls).toContainEqual({ method: "eq", args: ["country", "Kenya"] });
    expect(calls).toContainEqual({ method: "eq", args: ["sector", "Fintech"] });
  });

  it("builds an or() filter that includes a keywords.cs contains clause", () => {
    const { spy, calls } = makeQuerySpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildDirectoryQuery(spy as any, { q: "Shea", country: null, sector: null });
    const or = calls.find((c) => c.method === "or");
    expect(or).toBeTruthy();
    const clause = or!.args[0] as string;
    expect(clause).toContain("business_name.ilike.%Shea%");
    expect(clause).toContain("keywords.cs.{shea}");
  });

  it("omits the or() filter when the term is empty", () => {
    const { spy, calls } = makeQuerySpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildDirectoryQuery(spy as any, { q: "   ", country: null, sector: null });
    expect(calls.some((c) => c.method === "or")).toBe(false);
  });
});

describe("directoryNextPageParam", () => {
  const page = (n: number, nextOffset = 100): DirectoryPage => ({
    rows: Array.from({ length: n }, (_, i) => ({ id: String(i) })) as never,
    count: 0,
    nextOffset,
  });

  it("returns the next offset on a full page", () => {
    expect(directoryNextPageParam(page(PAGE_SIZE, 48))).toBe(48);
  });

  it("returns undefined on a short (final) page", () => {
    expect(directoryNextPageParam(page(PAGE_SIZE - 1))).toBeUndefined();
  });
});
