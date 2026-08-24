import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function statusRow(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    sourceUrl: `https://example.org/program-${id}`,
    sourceName: `Funder ${id}`,
    verificationStatus: "verified",
    applicationStatus: "open",
    statusCheckedAt: new Date("2026-08-22T12:00:00Z"),
    statusEvidenceUrl: `https://example.org/program-${id}`,
    opensAt: null,
    deadlineAt: new Date("2026-10-01T23:59:59Z"),
    deadlineTimezone: "UTC",
    deadlineStatus: "confirmed",
    currentCycleLabel: "2026 cycle",
    applicationUrl: `https://example.org/program-${id}/apply`,
    ...overrides,
  };
}

function serviceWith(selectResults: unknown[][]) {
  const db = queryDb(selectResults);
  const subs = { isActiveForUser: vi.fn().mockResolvedValue(true) } as unknown as SubscriptionsService;
  const roles = { hasAny: vi.fn() } as unknown as RolesService;
  const curate = vi.fn();
  const ai = { curate } as unknown as AiGatewayService;
  const env = { AI_MODEL: "test-model" } as Env;
  return { service: new FundingService(db, env, subs, roles, ai), curate };
}

describe("FundingService verified-first search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns five strong curated matches without consuming an AI call", async () => {
    // select #1 = no AI cache, #2 = curated feed, #3 = current-cycle status projection.
    const { service, curate } = serviceWith([
      [],
      [1, 2, 3, 4, 5].map(curated),
      [1, 2, 3, 4, 5].map((id) => statusRow(id)),
    ]);

    const result = await service.search("user-1", "Nigeria climate agritech");

    expect(curate).not.toHaveBeenCalled();
    expect(result.cached).toBe(false);
    expect(result.opportunities).toHaveLength(5);
    expect(result.opportunities.every((o) => o.discovery_source === "verified_feed")).toBe(true);
    expect(result.opportunities.every((o) => o.verification_status === "verified")).toBe(true);
    expect(result.opportunities.every((o) => o.application_status === "open")).toBe(true);
  });

  it("downgrades stale stored OPEN state to unknown at the API boundary", async () => {
    const { service } = serviceWith([
      [],
      [1, 2, 3, 4, 5].map(curated),
      [1, 2, 3, 4, 5].map((id) => statusRow(id, {
        applicationStatus: "open",
        statusCheckedAt: new Date("2026-08-19T00:00:00Z"),
      })),
    ]);

    const result = await service.search("user-1", "Nigeria climate agritech");
    expect(result.opportunities.every((o) => o.application_status === "unknown")).toBe(true);
  });
});
