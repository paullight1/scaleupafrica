import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNewsletter from "./AdminNewsletter";

const mutations = vi.hoisted(() => ({
  add: vi.fn(),
  status: vi.fn(),
  retry: vi.fn(),
  duplicate: vi.fn(),
  resync: vi.fn(),
}));

vi.mock("@/hooks/queries/adminNewsletter", () => ({
  useNewsletterOverview: () => ({ isLoading: false, isError: false, data: {
    activeSubscribers: 128, unsubscribedSubscribers: 8, newSubscribers30d: 14,
    delivered30d: 920, clicked30d: 84, unsubscribed30d: 3,
    deliveryRate: 0.98, clickRate: 0.091, failedSyncCount: 2, configured: true,
    recentCampaigns: [],
  } }),
  useNewsletterSubscribers: () => ({ isLoading: false, isError: false, data: {
    rows: [{ id: "sub-1", email: "founder@example.com", status: "subscribed", source: "landing-cta", consent_source: "site", subscribed_at: "2026-08-10T10:00:00Z", unsubscribed_at: null, unsubscribe_reason: null, brevo_sync_status: "synced", brevo_synced_at: "2026-08-10T10:01:00Z", brevo_sync_error: null, created_at: "2026-08-10T10:00:00Z", updated_at: "2026-08-10T10:01:00Z" }],
    total: 1, page: 1, pageSize: 40, sources: ["landing-cta"],
  } }),
  useNewsletterCampaigns: () => ({ isLoading: false, isError: false, data: { rows: [] } }),
  useNewsletterHealth: () => ({ isLoading: false, isError: false, data: { configured: true, connected: true, listId: 19, senderId: 7, lastWebhookAt: "2026-08-24T10:00:00Z", lastSyncAt: "2026-08-24T09:00:00Z" } }),
  useAddSubscriber: () => ({ mutate: mutations.add, isPending: false }),
  useSetSubscriberStatus: () => ({ mutate: mutations.status, isPending: false }),
  useRetrySubscriberSync: () => ({ mutate: mutations.retry, isPending: false }),
  useDuplicateNewsletterCampaign: () => ({ mutate: mutations.duplicate, isPending: false }),
  useCancelNewsletterCampaign: () => ({ mutate: vi.fn(), isPending: false }),
  useResyncNewsletterAudience: () => ({ mutate: mutations.resync, isPending: false }),
  useSubscriberConsent: () => ({ data: { rows: [] }, isLoading: false }),
}));

vi.mock("@/components/newsletter/CampaignStudio", () => ({
  default: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Create campaign">Campaign studio</div> : null,
}));

function renderPage(entry = "/admin/newsletter") {
  return render(<MemoryRouter initialEntries={[entry]}><AdminNewsletter /></MemoryRouter>);
}

describe("AdminNewsletter", () => {
  beforeEach(() => Object.values(mutations).forEach((mutation) => mutation.mockReset()));

  it("moves between the four newsletter workspaces", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Newsletter command center" })).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /campaigns/i }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("heading", { name: "Campaigns" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /subscribers/i }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("heading", { name: "Audience" })).toBeInTheDocument();
    expect(screen.getByText("founder@example.com")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /settings/i }), { button: 0, ctrlKey: false });
    expect(await screen.findByText("Brevo connection")).toBeInTheDocument();
  });

  it("opens the rich campaign studio from the primary action", () => {
    renderPage("/admin/newsletter?view=campaigns");
    fireEvent.click(screen.getByRole("button", { name: "New campaign" }));
    expect(screen.getByRole("dialog", { name: "Create campaign" })).toBeInTheDocument();
  });
});
