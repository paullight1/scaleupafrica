import { describe, expect, it } from "vitest";
import {
  buildMemberOpportunityMutation,
  analyticsEventForMemberState,
  type MemberOpportunityStateName,
} from "./memberOpportunityState";

const opportunityId = "00000000-0000-4000-8000-000000000001";

function payload(state: MemberOpportunityStateName) {
  return buildMemberOpportunityMutation({ opportunityId, state, note: "My note" }, new Date("2026-08-22T12:00:00Z"));
}

describe("member opportunity workflow mutation contract", () => {
  it.each(["saved", "preparing", "won", "rejected", "dismissed"] as const)(
    "%s leaves the original applied_at untouched",
    (state) => {
      const result = payload(state);
      expect(result).toMatchObject({ opportunity_id: opportunityId, state, note: "My note" });
      expect(result).not.toHaveProperty("applied_at");
    },
  );

  it("applied stamps the application timeline exactly once at the transition boundary", () => {
    expect(payload("applied")).toMatchObject({
      opportunity_id: opportunityId,
      state: "applied",
      applied_at: "2026-08-22T12:00:00.000Z",
    });
  });

  it("dismissed remains a member-state mutation and cannot contain canonical funding fields", () => {
    const result = payload("dismissed");
    expect(result.state).toBe("dismissed");
    expect(result).not.toHaveProperty("application_status");
    expect(result).not.toHaveProperty("verification_status");
    expect(result).not.toHaveProperty("eligibility_status");
  });

  it("maps only successful workflow outcomes to success analytics", () => {
    expect(analyticsEventForMemberState("saved")).toBe("recommendation_save");
    expect(analyticsEventForMemberState("preparing")).toBeNull();
    expect(analyticsEventForMemberState("applied")).toBe("application_submitted");
    expect(analyticsEventForMemberState("won")).toBe("application_won");
    expect(analyticsEventForMemberState("rejected")).toBe("application_rejected");
    expect(analyticsEventForMemberState("dismissed")).toBe("recommendation_not_relevant");
  });
});
