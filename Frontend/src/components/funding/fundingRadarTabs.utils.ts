import { classifyFundingSurface, type FundingSurface, type PrimaryFundingGateInput } from "@/lib/funding/primaryFundingGate";

export interface FundingRadarTabItem {
  id: string;
  gate: PrimaryFundingGateInput;
}

export function fundingSurfaceCounts(items: FundingRadarTabItem[]) {
  const counts: Record<FundingSurface, number> = {
    open_for_you: 0,
    closing_soon: 0,
    watchlist: 0,
    explore: 0,
  };
  for (const item of items) {
    for (const surface of classifyFundingSurface(item.gate)) counts[surface] += 1;
  }
  return counts;
}
