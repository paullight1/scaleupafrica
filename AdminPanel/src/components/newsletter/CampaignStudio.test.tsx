import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CampaignStudio from "./CampaignStudio";

const state = vi.hoisted(() => ({
  campaign: null as null | Record<string, unknown>,
  save: vi.fn(),
  test: vi.fn(),
  deliver: vi.fn(),
}));

vi.mock("@/hooks/queries/adminNewsletter", () => ({
  useNewsletterCampaign: () => ({ data: state.campaign, isLoading: false, isError: false }),
  useSaveNewsletterCampaign: () => ({ mutate: state.save, isPending: false }),
  useAudienceEstimate: () => ({ data: { count: 42, sample: [{ email: "founder@example.com", source: "landing-cta", subscribedAt: "2026-08-10T10:00:00Z" }] }, isLoading: false, isError: false }),
  useSendCampaignTest: () => ({ mutate: state.test, isPending: false }),
  useDeliverNewsletterCampaign: () => ({ mutate: state.deliver, isPending: false }),
  useCampaignReport: () => ({ data: null, isLoading: false }),
}));

describe("CampaignStudio", () => {
  beforeEach(() => {
    state.campaign = null;
    state.save.mockReset();
    state.test.mockReset();
    state.deliver.mockReset();
  });

  it("builds structured content and lets the sender choose a segment", () => {
    render(<CampaignStudio open campaignId={null} onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Internal campaign name"), { target: { value: "August opportunities" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Three grants worth applying for" } });
    fireEvent.click(screen.getByRole("button", { name: "Add paragraph" }));
    fireEvent.change(screen.getByLabelText("Paragraph 1"), { target: { value: "A focused selection for your business." } });
    expect(screen.getByDisplayValue("A focused selection for your business.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Audience" }));
    fireEvent.click(screen.getByLabelText("Selected segment"));
    fireEvent.change(screen.getByLabelText("Signup sources"), { target: { value: "landing-cta, footer" } });
    expect(screen.getByText("42 estimated recipients")).toBeInTheDocument();
  });

  it("requires a successful test for the exact revision before delivery", () => {
    state.campaign = {
      id: "campaign-1", internal_name: "August opportunities", subject: "Three grants", preview_text: "",
      sender_name: "Cresciva", sender_email: "hello@cresciva.com", reply_to: "hello@cresciva.com",
      content_blocks: [{ id: "p1", type: "paragraph", text: "Useful funding" }],
      audience_filter: { mode: "all", sources: [], joinedAfter: null, joinedBefore: null },
      revision: 3, status: "draft", last_test_revision: null, last_test_status: null,
    };
    state.test.mockImplementation((_input, options) => options?.onSuccess?.({ sent: true, revision: 3, email: "admin@cresciva.com" }));
    render(<CampaignStudio open campaignId="campaign-1" onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Review & deliver" }));
    expect(screen.getByRole("button", { name: "Send now" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Test recipient"), { target: { value: "admin@cresciva.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send test" }));
    expect(screen.getByText("Test delivered for revision 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send now" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Compose" }));
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Three grants and a loan" } });
    fireEvent.click(screen.getByRole("button", { name: "Review & deliver" }));
    expect(screen.getByRole("button", { name: "Send now" })).toBeDisabled();
    expect(screen.getByText("Test required")).toBeInTheDocument();
  });
});
