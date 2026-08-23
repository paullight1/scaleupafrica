import { SecurityCard } from "@/components/dashboard/SecurityCard";
import { MfaCard } from "@/components/dashboard/MfaCard";

export function DashboardSecurity() {
  return (
    <section aria-labelledby="security-heading">
      <div className="mb-5 md:mb-6">
        <h2 id="security-heading" className="font-display text-2xl font-semibold text-ink-strong">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your password and two-factor authentication.</p>
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        <SecurityCard />
        <MfaCard />
      </div>
    </section>
  );
}

export default DashboardSecurity;
