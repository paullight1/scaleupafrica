// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardAccount } from "./DashboardAccount";

vi.mock("@/components/billing/BillingPanel", () => ({ default: () => <div>Billing panel</div> }));
vi.mock("@/components/dashboard/SecurityCard", () => ({ SecurityCard: () => <div>Security card</div> }));
vi.mock("@/components/dashboard/MfaCard", () => ({ MfaCard: () => <div>MFA card</div> }));
vi.mock("@/components/dashboard/NotificationPrefsCard", () => ({ NotificationPrefsCard: () => <div>General email preferences</div> }));
vi.mock("@/components/funding/FundingNotificationPreferences", () => ({ FundingNotificationPreferences: () => <div>Granular funding alerts</div> }));
vi.mock("@/components/dashboard/DataRightsCard", () => ({ DataRightsCard: () => <div>Data rights</div> }));
vi.mock("@/components/dashboard/SignOutCard", () => ({ SignOutCard: () => <div>Sign out</div> }));

function renderAccount(path = "/dashboard/account/membership") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/account/*" element={<DashboardAccount />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardAccount", () => {
  it("offers separate account sections and renders only the selected panel", () => {
    renderAccount();

    expect(screen.getByRole("navigation", { name: "Account sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /membership/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Billing panel")).toBeInTheDocument();
    expect(screen.queryByText("Security card")).not.toBeInTheDocument();
    expect(screen.queryByText("General email preferences")).not.toBeInTheDocument();
  });

  it("exposes a mobile account section menu inside the account panel", () => {
    renderAccount("/dashboard/account/security");

    expect(screen.getByLabelText("Account section")).toHaveValue("/dashboard/account/security");
    expect(screen.getByText("Security card")).toBeInTheDocument();
    expect(screen.queryByText("Billing panel")).not.toBeInTheDocument();
  });
});
