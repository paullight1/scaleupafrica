import { describe, expect, it, vi } from "vitest";
import { FundingService } from "../src/funding/funding.service";
import type { Db } from "../src/db/client";
import type { Env } from "../src/config/env";
import type { SubscriptionsService } from "../src/subscriptions/subscriptions.service";
import type { RolesService } from "../src/auth/roles.service";
import type { AiGatewayService } from "../src/funding/ai-gateway.service";

function queryDb(selectResults: unknown[][]): Db {
  let call = 0;
  return {
    select: () => {
      const result = selectResults[call++] ?? [];
      return {
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(result),
            orderBy: () => ({ limit: () => Promise.resolve(result) }),
          }),
        }),
      };
    },
  } as unknown as Db;
}

function curated(id: number) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    title: `Nigeria Climate Agritech Fund ${id}`,
    funder: `Funder ${id}`,
    type: "Grant",
    summary: "Climate finance for agritech and food-security businesses in Nigeria.",
    amount: "$50,000",
    opens: "",
    deadline: "2026-10-01",
    eligibility: "Nigerian agritech SMEs",
    url: `https://example.org/program-${id}`,
    tags: ["climate", "agritech"],
    countryFocus: ["Nigeria"],
    status: "published",
    featured: false,
    details: {},
    lastVerifiedAt: new Date("2026-08-20T00:00:00Z"),
    verifiedBy: null,
    batchId: null,
    source: "manual",
    createdAt: new Date("2026-08-20T00:00:00Z"),
    updatedAt: new Date("2026-08-20T00:00:00Z"),
  };
}

describe("FundingService verified-first search", () => {
  it("returns five strong curated matches without consuming an AI call", async () => {
    // select #1 = no AI cache, select #2 = curated feed.
    const db = queryDb([[], [1, 2, 3, 4, 5].map(curated)]);
    const subs = { isActiveForUser: vi.fn().mockResolvedValue(true) } as unknown as SubscriptionsService;
    const roles = { hasAny: vi.fn() } as unknown as RolesService;
    const curate = vi.fn();
    const ai = { curate } as unknown as AiGatewayService;
    const env = { AI_MODEL: "test-model" } as Env;
    const service = new FundingService(db, env, subs, roles, ai);

    const result = await service.search("user-1", "Nigeria climate agritech");

    expect(curate).not.toHaveBeenCalled();
    expect(result.cached).toBe(false);
    expect(result.opportunities).toHaveLength(5);
    expect(result.opportunities.every((o) => o.discovery_source === "verified_feed")).toBe(true);
    expect(result.opportunities.every((o) => o.verification_status === "verified")).toBe(true);
  });
});
