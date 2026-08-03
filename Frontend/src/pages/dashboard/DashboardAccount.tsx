import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@shared/components/common/PageHeader";
import BillingPanel from "@/components/billing/BillingPanel";
import { SecurityCard } from "@/components/dashboard/SecurityCard";
import { MfaCard } from "@/components/dashboard/MfaCard";
import { NotificationPrefsCard } from "@/components/dashboard/NotificationPrefsCard";
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
      <h2
        id={`${id}-heading`}
        className="font-display text-lg font-semibold text-ink-strong"
      >
        {title}
      </h2>
      <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/**
 * Account — membership, security, preferences.
 *
 * Previously "/dashboard/billing", where five cards of unrelated weight sat in a
 * flat grid: a payment panel next to a notification toggle next to a sign-out
 * button. Now each concern is a labelled section in descending order of
 * consequence, and sign-out is a quiet footer action rather than a card
 * competing with billing for the eye.
 */
export function DashboardAccount() {
  useEffect(() => {
    document.title = "Account — Cresciva";
  }, []);

  // Client-side navigation doesn't honour a hash, and /dashboard/billing#billing
  // redirects here — so the anchor has to be applied by hand or the redirect
  // silently drops the user at the top of the page.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="space-y-10">
      <PageHeader title="Account" subtitle="Your membership, security and preferences." />

      <Section
        id="billing"
        title="Membership"
        description="Your plan, payments and receipts."
      >
        <BillingPanel />
      </Section>

      <Section
        id="security"
        title="Security"
        description="Your password and two-factor authentication."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <SecurityCard />
          <MfaCard />
        </div>
      </Section>

      <Section
        id="notifications"
        title="Notifications"
        description="What we're allowed to email you about."
      >
        <NotificationPrefsCard />
      </Section>

      <div className="border-t border-border pt-6">
        <SignOutCard />
      </div>
    </div>
  );
}

export default DashboardAccount;
