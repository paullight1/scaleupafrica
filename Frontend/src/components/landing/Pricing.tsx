import { Link } from "react-router-dom";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading } from "@shared/components/marketing";
import { useAuth } from "@shared/hooks/useAuth";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import {
  formatPlanPrice,
  MEMBERSHIP_FEATURES,
  PLAN_INTERVAL_LABELS,
  PLAN_LABELS,
  PLAN_ORDER,
  WHATSAPP_CONCIERGE_URL,
} from "@/lib/billing";

/**
 * Pricing for the three USD Paystack auto-renewing plans. Signed-in users check
 * out inline; signed-out users go to auth then land on the funding paywall.
 */
const Pricing = () => {
  const { user } = useAuth();

  return (
    <Section id="pricing" tone="light">
      <SectionHeading
        eyebrow="Membership"
        title={
          <>
            Invest in Your{" "}
            <span className="text-primary-dark">Growth Journey</span>
          </>
        }
        lead="Choose the cadence that fits your growth journey. Every plan unlocks the full Funding Radar."
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mt-8 text-xs text-muted-foreground">
          Prices are charged in US Dollars. Paystack securely manages your
          recurring card payment.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((planCode) => (
          <div
            key={planCode}
            className="rounded-xl border border-border bg-card p-8 shadow-medium lg:p-9"
          >
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-navy">
                {PLAN_LABELS[planCode]} Membership
              </p>
              <h3 className="mb-2 font-display text-2xl font-bold text-foreground">
                The Collective
              </h3>
              <p className="text-muted-foreground">
                Full access to the Funding Radar, curated grants, and member
                resources.
              </p>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold text-foreground">
                {formatPlanPrice(planCode)}
              </span>
              <span className="text-lg text-muted-foreground">
                /{PLAN_INTERVAL_LABELS[planCode]}
              </span>
            </div>

            {user ? (
              <CheckoutButton
                planCode={planCode}
                currency="USD"
                className="mb-4 w-full"
              >
                Subscribe
                <ArrowRight className="h-4 w-4" />
              </CheckoutButton>
            ) : (
              <Button
                asChild
                variant="default"
                size="lg"
                className="mb-4 w-full"
              >
                <Link to="/auth/signup?next=/funding">
                  Subscribe
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            <ul className="space-y-4">
              {MEMBERSHIP_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-dark" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Access is activated automatically once payment is confirmed — usually
        under a minute. Your subscription auto-renews at the selected interval
        until you cancel it. Paying by transfer or mobile money?{" "}
        <a
          href={WHATSAPP_CONCIERGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-navy underline-offset-4 hover:underline"
        >
          <MessageCircle className="mr-1 inline h-4 w-4" aria-hidden="true" />{" "}
          Message us on WhatsApp
        </a>{" "}
        and we activate within 12 hours.{" "}
        <Link
          to="/disclaimer"
          className="font-semibold text-navy underline-offset-4 hover:underline"
        >
          Read the full disclaimer
        </Link>
        .
      </p>
    </Section>
  );
};

export default Pricing;
