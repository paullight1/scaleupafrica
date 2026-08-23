import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BusinessEnrichmentStart } from "./BusinessEnrichmentStart";
import { BusinessIdentityConfirm } from "./BusinessIdentityConfirm";
import type { BusinessEnrichmentResponse } from "@/lib/api/types";

function response(over: Partial<BusinessEnrichmentResponse> = {}): BusinessEnrichmentResponse {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    state: "resolved",
    candidates: [
      {
        id: "candidate-1",
        canonicalName: "Top100 Africa Future Leaders",
        website: "https://top100afl.com/",
        country: "Nigeria",
        summary: "Pan-African youth leadership organisation",
        identityConfidence: 96,
        sourceUrls: ["https://top100afl.com/about"],
        enrichedProfile: { organisation_type: "nonprofit" },
        fieldEvidence: { organisation_type: ["https://top100afl.com/about"] },
        memberState: "proposed",
      },
    ],
    selectedCandidate: {
      id: "candidate-1",
      canonicalName: "Top100 Africa Future Leaders",
      website: "https://top100afl.com/",
      country: "Nigeria",
      summary: "Pan-African youth leadership organisation",
      identityConfidence: 96,
      sourceUrls: ["https://top100afl.com/about"],
      enrichedProfile: { organisation_type: "nonprofit" },
      fieldEvidence: { organisation_type: ["https://top100afl.com/about"] },
      memberState: "proposed",
    },
    ...over,
  };
}

describe("BusinessEnrichmentStart", () => {
  it("accepts business name as the only required input", () => {
    const onStart = vi.fn();
    render(<BusinessEnrichmentStart onStart={onStart} />);
    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: "Top100 Africa Future Leaders" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find my organisation/i }));
    expect(onStart).toHaveBeenCalledWith({ businessName: "Top100 Africa Future Leaders" });
  });

  it("keeps optional website and country hints optional", () => {
    render(<BusinessEnrichmentStart onStart={() => {}} />);
    expect(screen.getByLabelText(/website.*optional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country.*optional/i)).toBeInTheDocument();
  });

  it("shows provider failure without implying the member profile was changed", () => {
    render(
      <BusinessEnrichmentStart
        onStart={() => {}}
        error="We couldn't research your organisation right now. Your current profile is unchanged."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/current profile is unchanged/i);
  });
});

describe("BusinessIdentityConfirm", () => {
  it("shows resolved identity with confirm, edit and reject actions", () => {
    render(
      <BusinessIdentityConfirm
        result={response()}
        onConfirm={() => {}}
        onEdit={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText("Top100 Africa Future Leaders")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use this profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /this isn't mine/i })).toBeInTheDocument();
    expect(screen.getByText(/where we found this/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /top100afl.com/i })).toHaveAttribute(
      "href",
      "https://top100afl.com/about",
    );
  });

  it("requires explicit candidate selection for ambiguous identity", () => {
    const onConfirm = vi.fn();
    const ambiguous = response({
      state: "ambiguous",
      selectedCandidate: undefined,
      candidates: [
        response().candidates[0],
        {
          ...response().candidates[0],
          id: "candidate-2",
          canonicalName: "Top100 Future Leaders Foundation",
          website: "https://different.example/",
          identityConfidence: 89,
        },
      ],
    });
    render(
      <BusinessIdentityConfirm
        result={ambiguous}
        onConfirm={onConfirm}
        onEdit={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText(/choose the organisation that is yours/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /select Top100 Africa Future Leaders/i }));
    expect(onConfirm).toHaveBeenCalledWith("candidate-1");
  });

  it("offers website/manual fallback when no identity is found", () => {
    render(
      <BusinessIdentityConfirm
        result={response({ state: "not_found", candidates: [], selectedCandidate: undefined })}
        onConfirm={() => {}}
        onEdit={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText(/couldn't confidently identify your organisation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter details manually/i })).toBeInTheDocument();
  });
});
