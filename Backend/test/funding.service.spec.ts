import { describe, it, expect } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { FundingService } from "../src/funding/funding.service";
import type { Db } from "../src/db/client";
import type { Env } from "../src/config/env";
import { SubscriptionsService } from "../src/subscriptions/subscriptions.service";
import { RolesService } from "../src/auth/roles.service";
import { AiGatewayService } from "../src/funding/ai-gateway.service";

// DB whose curated-feed query resolves to an empty published list.
const emptyDb = {
  select: () => ({
    from: () => ({
      where: () => ({ orderBy: () => ({ limit: () => Promise.resolve([]) }) }),
    }),
  }),
} as unknown as Db;

function makeService(opts: { active: boolean; staff: boolean }): FundingService {
  const subs = { isActiveForUser: async () => opts.active } as unknown as SubscriptionsService;
  const roles = { hasAny: async () => opts.staff } as unknown as RolesService;
  return new FundingService(emptyDb, {} as Env, subs, roles, {} as AiGatewayService);
}

describe("FundingService.curatedList gate (C1)", () => {
  it("rejects a non-member, non-staff caller with 403", async () => {
    const svc = makeService({ active: false, staff: false });
    await expect(svc.curatedList("u1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows a caller with an active subscription", async () => {
    const svc = makeService({ active: true, staff: false });
    await expect(svc.curatedList("u1")).resolves.toEqual([]);
  });

  it("allows a staff caller without a subscription", async () => {
    const svc = makeService({ active: false, staff: true });
    await expect(svc.curatedList("u1")).resolves.toEqual([]);
  });
});
