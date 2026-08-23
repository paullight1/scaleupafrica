import { classifyFundingSurface, type FundingSurface, type PrimaryFundingGateInput } from "@/lib/funding/primaryFundingGate";

export interface FundingRadarTabItem {
  id: string;
  gate: PrimaryFundingGateInput;
}

const TABS: Array<{ id: FundingSurface; label: string }> = [
  { id: "open_for_you", label: "Open for you" },
  { id: "closing_soon", label: "Closing soon" },
  { id: "watchlist", label: "Watchlist" },
  { id: "explore", label: "Explore" },
];

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

export function FundingRadarTabs({
  items,
  active,
  onChange,
}: {
  items: FundingRadarTabItem[];
  active: FundingSurface;
  onChange: (surface: FundingSurface) => void;
}) {
  const counts = fundingSurfaceCounts(items);
  return (
    <div
      role="tablist"
      aria-label="Funding Radar views"
      className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className={`min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {tab.label} <span className="ml-1 tabular-nums">{counts[tab.id]}</span>
        </button>
      ))}
    </div>
  );
}