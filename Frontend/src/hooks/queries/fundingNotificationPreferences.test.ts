import { describe, expect, it } from "vitest";
import {
  effectiveFundingNotificationPreferences,
  fundingNotificationPreferenceMutation,
} from "./fundingNotificationPreferences";

describe("funding notification preference compatibility", () => {
  it("treats the legacy funding-email opt-out as the master consent gate", () => {
    expect(effectiveFundingNotificationPreferences({
      email_new_funding: false,
      email_new_matches: true,
      email_deadline_alerts: true,
    })).toEqual({ emailNewMatches: false, emailDeadlineAlerts: false });
  });

  it("preserves granular opt-outs when master funding consent is on", () => {
    expect(effectiveFundingNotificationPreferences({
      email_new_funding: true,
      email_new_matches: false,
      email_deadline_alerts: true,
    })).toEqual({ emailNewMatches: false, emailDeadlineAlerts: true });
  });

  it("uses legacy consent as the default for rows created before granular columns existed", () => {
    expect(effectiveFundingNotificationPreferences({ email_new_funding: false })).toEqual({
      emailNewMatches: false,
      emailDeadlineAlerts: false,
    });
    expect(effectiveFundingNotificationPreferences({ email_new_funding: true })).toEqual({
      emailNewMatches: true,
      emailDeadlineAlerts: true,
    });
  });

  it("updates master funding consent from whether either granular alert is enabled", () => {
    expect(fundingNotificationPreferenceMutation({ emailNewMatches: false, emailDeadlineAlerts: false })).toEqual({
      email_new_funding: false,
      email_new_matches: false,
      email_deadline_alerts: false,
    });
    expect(fundingNotificationPreferenceMutation({ emailNewMatches: false, emailDeadlineAlerts: true })).toEqual({
      email_new_funding: true,
      email_new_matches: false,
      email_deadline_alerts: true,
    });
  });
});
