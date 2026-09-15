import type { EngineRun } from "./fundingEngineApi";

export type FundingRunPresentation = {
  phase: "starting" | "running" | "completed" | "failed";
  progress: number;
  title: string;
  detail: string;
};

export function getFundingRunPresentation(
  run?: Pick<EngineRun, "status" | "opportunities_found">,
  requestPending = false,
): FundingRunPresentation {
  const status = run?.status?.toLowerCase();
  if (status === "completed") {
    return { phase: "completed", progress: 100, title: "Discovery complete", detail: "Your latest grant results are ready to review." };
  }
  if (status === "failed" || status === "error") {
    return { phase: "failed", progress: 100, title: "Discovery needs attention", detail: "Edutu could not complete this run. Check the run history for details." };
  }
  if (requestPending || status === undefined) {
    return { phase: "starting", progress: 18, title: "Starting discovery", detail: "Connecting to Edutu and preparing the grant crawl." };
  }
  return { phase: "running", progress: 42, title: "Discovery in progress", detail: "Edutu is crawling sources and classifying grant opportunities." };
}
