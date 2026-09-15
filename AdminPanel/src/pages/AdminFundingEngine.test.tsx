import { describe, expect, it } from "vitest";
import { getFundingRunPresentation } from "@/lib/fundingEngineRun";

describe("funding engine run presentation", () => {
  it("shows an active run as live progress that can continue in the background", () => {
    expect(getFundingRunPresentation({ status: "running" })).toEqual({
      phase: "running",
      progress: 42,
      title: "Discovery in progress",
      detail: "Edutu is crawling sources and classifying grant opportunities.",
    });
  });

  it("turns a completed run into a results-ready state", () => {
    expect(getFundingRunPresentation({ status: "completed", opportunities_found: 7 })).toEqual({
      phase: "completed",
      progress: 100,
      title: "Discovery complete",
      detail: "Your latest grant results are ready to review.",
    });
  });
});
