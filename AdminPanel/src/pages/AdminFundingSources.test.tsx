// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFundingSources from "./AdminFundingSources";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminFundingSources />
    </MemoryRouter>,
  );
}

const recheckMutate = vi.fn();
const refreshDueMutate = vi.fn();
const createSourceMutate = vi.fn();
const updateSourceMutate = vi.fn();

vi.mock("@/hooks/queries/fundingSources", () => ({
  useFundingSourceHealth: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      opportunities: [
        {
          id: "opp-failed",
          title: "Climate Growth Fund",
          funder: "Example Funder",
          sourceUrl: "https://example.org/fund",
          verificationStatus: "verified",
          applicationStatus: "unknown",
          statusCheckedAt: "2026-08-20T10:00:00Z",
          lastError: "fetch_timeout",
          lastSuccessAt: "2026-08-19T10:00:00Z",
          consecutiveFailures: 3,
          due: true,
          conflict: false,
        },
        {
          id: "opp-conflict",
          title: "Women Innovators Award",
          funder: "Another Funder",
          sourceUrl: "https://example.org/women",
          verificationStatus: "verified",
          applicationStatus: "unknown",
          statusCheckedAt: "2026-08-22T08:00:00Z",
          lastError: null,
          lastSuccessAt: "2026-08-22T08:00:00Z",
          consecutiveFailures: 0,
          due: false,
          conflict: true,
        },
      ],
      sources: [
        {
          id: "source-1",
          name: "Example Funder",
          baseUrl: "https://example.org",
          active: true,
          lastCheckedAt: "2026-08-20T10:00:00Z",
          lastSuccessAt: "2026-08-19T10:00:00Z",
          lastError: "fetch_timeout",
        },
      ],
      recentChecks: [],
    },
  }),
  useRecheckFundingOpportunity: () => ({ mutate: recheckMutate, isPending: false }),
  useRefreshDueFunding: () => ({ mutate: refreshDueMutate, isPending: false }),
  useCreateFundingSource: () => ({ mutate: createSourceMutate, isPending: false }),
  useUpdateFundingSource: () => ({ mutate: updateSourceMutate, isPending: false }),
}));

describe("AdminFundingSources", () => {
  beforeEach(() => {
    recheckMutate.mockReset();
    refreshDueMutate.mockReset();
    createSourceMutate.mockReset();
    updateSourceMutate.mockReset();
  });

  it("shows failed source health with error class and last success", () => {
    renderPage();
    expect(screen.getAllByText(/fetch_timeout/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 consecutive failures/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/last success/i).length).toBeGreaterThan(0);
  });

  it("shows conflicts as unknown and never exposes a force-open control", () => {
    renderPage();
    expect(screen.getByText(/conflicts \/ unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/women innovators award/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /force open/i })).toBeNull();
    expect(screen.queryByText(/^Open$/i)).toBeNull();
  });

  it("rechecks one opportunity through individual refresh mode", () => {
    renderPage();
    const buttons = screen.getAllByRole("button", { name: /recheck/i });
    fireEvent.click(buttons[0]);
    expect(recheckMutate).toHaveBeenCalledWith("opp-failed");
  });

  it("can request a bounded due refresh", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /refresh due/i }));
    expect(refreshDueMutate).toHaveBeenCalled();
  });

  it("edits source metadata through the invalidating source-registry mutation", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /edit source/i }));
    expect(screen.getByRole("dialog", { name: /edit funding source/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/base url/i), { target: { value: "https://example.org/funding" } });
    fireEvent.click(screen.getByRole("button", { name: /save source/i }));
    expect(updateSourceMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "source-1",
        name: "Example Funder",
        baseUrl: "https://example.org/funding",
        active: true,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
