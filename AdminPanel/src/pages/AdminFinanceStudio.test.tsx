// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminFunding from "./AdminFunding";
import AdminPayments from "./AdminPayments";

const mutate = vi.fn();
const reportRefetch = vi.fn();

const fundingRows = [
  {
    id: "funding-1",
    title: "Young Africa Works Grant",
    funder: "Mastercard Foundation",
    type: "Grant",
    summary: "Growth funding",
    amount: "USD 100,000",
    opens: null,
    deadline: null,
    eligibility: null,
    url: "https://example.com/grant",
    source_url: "https://example.com/grant",
    tags: [],
    country_focus: ["Nigeria"],
    status: "published",
    featured: true,
    source: "manual",
    verification_status: "verified",
    application_status: "open",
    deadline_status: "confirmed",
    deadline_at: "2026-12-01T00:00:00.000Z",
    status_checked_at: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "funding-2",
    title: "Creative Futures Fund",
    funder: "Culture Lab",
    type: "Fellowship",
    summary: "Creative funding",
    amount: "USD 20,000",
    opens: null,
    deadline: null,
    eligibility: null,
    url: "https://example.com/futures",
    source_url: "https://example.com/futures",
    tags: [],
    country_focus: ["Ghana"],
    status: "draft",
    featured: false,
    source: "ai",
    verification_status: "unverified",
    application_status: "closing_soon",
    deadline_status: "confirmed",
    deadline_at: "2026-09-01T00:00:00.000Z",
    status_checked_at: "2026-08-21T00:00:00.000Z",
  },
];

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1" } }),
}));

vi.mock("@/hooks/queries/adminOps", () => ({
  useAdminFunding: () => ({ data: fundingRows, isLoading: false, isError: false, refetch: vi.fn() }),
  useSaveFunding: () => ({ mutate, isPending: false }),
  useSetFundingStatus: () => ({ mutate, isPending: false }),
  useToggleFundingFeatured: () => ({ mutate, isPending: false }),
  useVerifyFunding: () => ({ mutate, isPending: false }),
  useDeleteFunding: () => ({ mutate, isPending: false }),
}));

vi.mock("../hooks/queries/adminPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/queries/adminPayments")>()),
  useAdminPaymentReport: ({ mode }: { mode: string }) => ({
    data: mode === "lifetime"
      ? {
          periodLabel: "Lifetime",
          byCurrency: {
            NGN: { amount: 150000000, payments: 24, average: 6250000 },
          },
          successfulPayments: 24,
          failedPayments: 3,
        }
      : {
          periodLabel: "August 2026",
          byCurrency: {
            NGN: { amount: 4250000, payments: 3, average: 1416667 },
            USD: { amount: 9000, payments: 1, average: 9000 },
          },
          successfulPayments: 3,
          failedPayments: 1,
        },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: reportRefetch,
  }),
  usePaymentReconciliation: () => ({
    data: {
      generated_at: "2026-08-25T08:00:00.000Z",
      summary: { payments_checked: 12, unhealthy_payments: 0, access_discrepancies: 0 },
      payments: [
        {
          id: "payment-1",
          provider: "bachs",
          reference: "CRES-001",
          status: "success",
          amount: 1500000,
          currency: "NGN",
          paid_at: "2026-08-24T08:00:00.000Z",
          checkout_id: "checkout-1",
          receipt_status: "sent",
          access_active: true,
          healthy: true,
          issues: [],
        },
      ],
      access_discrepancies: [],
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

describe("dashboard-style finance management", () => {
  it("turns funding operations into a clear opportunity radar", () => {
    render(<MemoryRouter><AdminFunding /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Funding opportunities" })).toBeInTheDocument();
    expect(screen.queryByText("Opportunity radar")).not.toBeInTheDocument();
    expect(screen.getByText("AI drafts")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search opportunities" })).toBeInTheDocument();
  });

  it("makes reconciliation health readable without implying write access", () => {
    render(<AdminPayments />);

    expect(screen.getByRole("heading", { name: "Payments" })).toBeInTheDocument();
    expect(screen.getByText("Reconciliation healthy")).toBeInTheDocument();
    expect(screen.queryByText("Read-only finance desk")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("opens amount tracking and switches from monthly to lifetime reporting", () => {
    render(<AdminPayments />);

    expect(screen.queryByText("Healthy payments")).not.toBeInTheDocument();
    expect(screen.getAllByText("August 2026").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /amount gotten/i }));

    expect(screen.getByRole("dialog", { name: "Payment insights" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yearly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lifetime" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
    expect(screen.getByText("1 payment")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lifetime" }));
    expect(screen.getByText("24 successful payments")).toBeInTheDocument();
  });

  it("does not request a report while the custom calendar range is incomplete", () => {
    reportRefetch.mockClear();
    render(<AdminPayments />);

    fireEvent.click(screen.getByRole("button", { name: /amount gotten/i }));
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(reportRefetch).not.toHaveBeenCalled();
  });
});
