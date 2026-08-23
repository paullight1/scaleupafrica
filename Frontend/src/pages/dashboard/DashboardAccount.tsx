import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@shared/components/common/PageHeader";
import BillingPanel from "@/components/billing/BillingPanel";
import { SecurityCard } from "@/components/dashboard/SecurityCard";
import { MfaCard } from "@/components/dashboard/MfaCard";
import { NotificationPrefsCard } from "@/components/dashboard/NotificationPrefsCard";
import { FundingNotificationPreferences } from "@/components/funding/FundingNotificationPreferences";
import { DataRightsCard } from "@/components/dashboard/DataRightsCard";
import { SignOutCard } from "@/components/dashboard/SignOutCard";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="font-display text-lg font-semibold text-ink-strong">
        {title}
      </h2>
      <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/** Account — membership, security, preferences and data rights. */
export function DashboardAccount() {
  useEffect(() => {
    document.title = "Account — Cresciva";
  }, []);

  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="space-y-10">
      <PageHeader title="Account" subtitle="Your membership, security, preferences and data rights." />

      <Section id="billing" title="Membership" description="Your plan, payments and receipts.">
        <BillingPanel />
      </Section>

      <Section id="security" title="Security" description="Your password and two-factor authentication.">
        <div className="grid gap-6 lg:grid-cols-2">
          <SecurityCard />
          <MfaCard />
        </div>
      </Section>

      <Section id="notifications" title="Notifications" description="What we're allowed to email you about.">
        <div className="grid gap-6 lg:grid-cols-2">
          <NotificationPrefsCard />
          <FundingNotificationPreferences />
        </div>
      </Section>

      <Section id="data" title="Data & account deletion" description="Access your data or permanently close your Cresciva account.">
        <DataRightsCard />
      </Section>

      <div className="border-t border-border pt-6">
        <SignOutCard />
      </div>
    </div>
  );
}

export default DashboardAccount;
