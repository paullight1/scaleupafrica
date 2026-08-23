// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FundingSearch } from "./FundingSearch";
import type { Opportunity } from "@/lib/fundingSchema";
import type { FundingResult } from "@/hooks/queries/funding";

const state = vi.hoisted(() => ({ result: null as FundingResult | null }));

vi.mock("@/hooks/queries/funding", () => ({
  useFundingProfile: () => ({ data: null }),
  buildKeywordChips: () => ["climate grant Africa"],
  useFundingResult: () => ({ data: state.result }),
  useGenerateFunding: () => ({ isPending:false,isError:false,isSuccess:false,error:null,mutate:vi.fn() }),
  fundingErrorMessage: () => "error",
  FundingError: class FundingError extends Error {},
}));
vi.mock("@shared/lib/analytics", () => ({ trackEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/components/funding/OpportunityCard", () => ({
  OpportunityCard: ({ opportunity, primaryApplyEligible }: { opportunity: Opportunity; primaryApplyEligible: boolean }) => <div data-testid="opportunity-card"><span>{opportunity.title}</span><span>{primaryApplyEligible?"apply-enabled":"apply-disabled"}</span></div>,
}));
vi.mock("@/components/funding/OpportunityCardSkeleton", () => ({ OpportunityCardSkeletonList: () => <div>loading</div> }));

function opportunity(title:string,overrides:Partial<Opportunity>={}):Opportunity{return{title,funder:"Example Funder",summary:"Funding for African businesses",url:"https://example.org/program",tags:[],sdg_focus:[],past_recipients:[],application_tips:[],match_reasons:[],discovery_source:"verified_feed",verification_status:"verified",source_checked_at:new Date().toISOString(),application_status:"open",status_checked_at:new Date().toISOString(),deadline_status:"unknown",...overrides};}

describe("FundingSearch trust groups",()=>{
  beforeEach(()=>{state.result={opportunities:[
    opportunity("AI Candidate",{discovery_source:"ai_assisted",verification_status:"unverified",application_status:"open"}),
    opportunity("Stale Curated",{verification_status:"stale",application_status:"upcoming"}),
    opportunity("Upcoming Verified",{application_status:"upcoming"}),
    opportunity("Current Verified"),
  ],keywordsRaw:"climate funding",generatedAt:new Date().toISOString(),cached:false};});

  it("renders verified current, other Cresciva records, then AI discoveries as separate groups",()=>{
    render(<FundingSearch/>);
    expect(screen.getByRole("heading",{name:"Verified current matches"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Other Cresciva records"})).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"AI discoveries"})).toBeInTheDocument();
    expect(screen.getAllByTestId("opportunity-card").map((node)=>node.textContent)).toEqual([
      "Current Verifiedapply-disabled",
      "Stale Curatedapply-disabled",
      "Upcoming Verifiedapply-disabled",
      "AI Candidateapply-disabled",
    ]);
  });

  it("never counts stale curated data as currently verified",()=>{
    render(<FundingSearch/>);
    expect(screen.getByText(/4 results · 1 verified current · 2 other Cresciva · 1 AI discovery/i)).toBeInTheDocument();
    expect(screen.queryByText(/3 verified/i)).toBeNull();
  });

  it("never promotes an AI result even when model-shaped data claims it is open",()=>{
    render(<FundingSearch/>);
    const cards=screen.getAllByTestId("opportunity-card");
    expect(cards[3]).toHaveTextContent("AI Candidate");
    expect(cards[3]).toHaveTextContent("apply-disabled");
  });
});
