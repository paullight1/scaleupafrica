// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardAccount } from "./DashboardAccount";

vi.mock("react-router-dom", () => ({ useLocation: () => ({ hash: "" }) }));
vi.mock("@/components/billing/BillingPanel", () => ({ default: () => <div>Billing panel</div> }));
vi.mock("@/components/dashboard/SecurityCard", () => ({ SecurityCard: () => <div>Security card</div> }));
vi.mock("@/components/dashboard/MfaCard", () => ({ MfaCard: () => <div>MFA card</div> }));
vi.mock("@/components/dashboard/NotificationPrefsCard", () => ({ NotificationPrefsCard: () => <div>General email preferences</div> }));
vi.mock("@/components/funding/FundingNotificationPreferences", () => ({ FundingNotificationPreferences: () => <div>Granular funding alerts</div> }));
vi.mock("@/components/dashboard/SignOutCard", () => ({ SignOutCard: () => <div>Sign out</div> }));

describe("DashboardAccount notification preferences", () => {
  it("shows both broad account preferences and granular funding alerts", () => {
    render(<DashboardAccount />);
    expect(screen.getByText("General email preferences")).toBeInTheDocument();
    expect(screen.getByText("Granular funding alerts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument();
  });
});
