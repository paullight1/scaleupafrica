import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading } from "@shared/components/marketing";
import { useAuth } from "@shared/hooks/useAuth";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { CurrencyToggle } from "@/components/billing/CurrencyToggle";
import {
  defaultCurrency,
  formatPlanPrice,
  MEMBERSHIP_FEATURES,
  WHATSAPP_CONCIERGE_URL,
  type Currency,
  type PlanCode,
} from "@/lib/billing";

const PLAN_CARDS: Array<{
  code: PlanCode;
  name: string;
  term: string;
  description: string;
}> = [
  {
    code: "monthly",
    name: "Monthly",
    term: "month",
    description: "A flexible way to keep your Funding Radar access active.",
  },
  {
    code: "quarterly",
    name: "Quarterly",
    term: "3 months",
    description: "More runway for founders building toward their next milestone.",
  },
  {
    code: "annual",
    name: "Annual",
    term: "year",
    description: "Best value for a full year of funding intelligence and resources.",
  },
];

/** Membership pricing and plan selection. Prices are resolved by the server at checkout. */
const Pricing = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency());

  return (
    <Section id="pricing" tone="light">
      <SectionHeading
        eyebrow="Membership"
        title={
          <>
            Invest in Your <span className="text-primary-dark">Growth Journey</span>
          </>
        }
        lead="Choose the membership rhythm that fits your journey. Simple, transparent pricing for African founders ready to scale."
      />

      <div className="mx-auto max-w-3xl text-center">
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <CurrencyToggle value={currency} onChange={setCurrency} />
          <p className="max-w-md text-xs text-muted-foreground">
            Monthly and quarterly plans are currently available in USD. Paying by card from outside
            Nigeria? Your bank may convert the charge at its prevailing rate.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const price = formatPlanPrice(plan.code, currency);
          const available = price !== null;

          return (
            <div
              key={plan.code}
              className="flex flex-col rounded-xl border border-border bg-card p-7 shadow-medium lg:p-8"
            >
              <div className="mb-7">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-navy">{plan.name}</p>
                <h3 className="mb-2 font-display text-2xl font-bold text-foreground">The Collective</h3>
                <p className="min-h-12 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-7 flex min-h-16 items-baseline gap-2">
                {available ? (
                  <>
                    <span className="font-display text-5xl font-bold text-foreground">{price}</span>
                    <span className="text-lg text-muted-foreground">/{plan.term}</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">Available in USD</span>
                )}
              </div>

              {user && available ? (
                <CheckoutButton planCode={plan.code} currency={currency} className="mb-4 w-full">
                  Choose {plan.name}
                  <ArrowRight className="h-4 w-4" />
                </CheckoutButton>
              ) : available ? (
                <Button asChild variant="default" size="lg" className="mb-4 w-full">
                  <Link
                    to={
                      "/auth/signup?next=" +
                      encodeURIComponent("/dashboard/funding?plan=" + plan.code)
                    }
                  >
                    Choose {plan.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled size="lg" className="mb-4 w-full">
                  USD plan required
                </Button>
              )}

              {plan.code === "annual" && (
                <a
                  href={WHATSAPP_CONCIERGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-8 flex items-center justify-center gap-2 text-sm font-medium text-navy underline-offset-4 hover:text-navy-light hover:underline"
                >
                  <MessageCircle className="h-4 w-4" /> Pay by transfer or mobile money
                </a>
              )}

              <ul className="mt-auto space-y-4">
                {MEMBERSHIP_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-dark" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Access is activated automatically once payment is confirmed — usually under a minute. Membership
        does not auto-renew; renew manually whenever you need to extend access.{" "}
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
