import { DataRightsCard } from "@/components/dashboard/DataRightsCard";
import { SignOutCard } from "@/components/dashboard/SignOutCard";

export function DashboardData() {
  return (
    <section aria-labelledby="data-heading">
      <div className="mb-5 md:mb-6">
        <h2 id="data-heading" className="font-display text-2xl font-semibold text-ink-strong">Data & privacy</h2>
        <p className="mt-1 text-sm text-muted-foreground">Access your data or close your Cresciva account.</p>
      </div>
      <div className="space-y-5">
        <DataRightsCard />
        <div className="border-t border-border pt-5"><SignOutCard /></div>
      </div>
    </section>
  );
}

export default DashboardData;
