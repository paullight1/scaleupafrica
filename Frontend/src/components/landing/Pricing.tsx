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
} from "@/lib/billing";

/**
 * Pricing (Plan 06 §5.1) — two canonical charge currencies (NGN / USD) from the
 * single server price list. The 90-row FX table and the fake "Eurozone" country
 * are gone. Signed-in users check out inline; signed-out users go to auth then
 * land on the /funding paywall (no profile-form detour).
 */
const Pricing = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency());
  const price = formatPlanPrice(currency);

  return (
    <Section id="pricing" tone="light">
      <SectionHeading
        eyebrow="Membership"
        title={
          <>
            Invest in Your <span className="text-primary-dark">Growth Journey</span>
          </>
        }
        lead="One annual membership, complete access. Simple, transparent, built for African founders ready to scale."
      />

      <div className="mx-auto max-w-3xl text-center">
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <CurrencyToggle value={currency} onChange={setCurrency} />
          <p className="max-w-md text-xs text-muted-foreground">
            Paying by card from outside Nigeria? You'll be charged in USD (or NGN) and your bank
            converts at its prevailing rate.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-lg">
        <div className="rounded-xl border border-border bg-card p-8 shadow-medium lg:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-navy">
              Annual Membership
            </p>
            <h3 className="mb-2 font-display text-2xl font-bold text-foreground">The Collective</h3>
            <p className="text-muted-foreground">
              Full-year access to the Funding Radar, curated grants, and member resources.
            </p>
          </div>

          <div className="mb-8 flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-foreground">{price}</span>
            <span className="text-lg text-muted-foreground">/year</span>
          </div>

          {user ? (
            <CheckoutButton currency={currency} className="mb-4 w-full">
              Join the Collective
              <ArrowRight className="h-4 w-4" />
            </CheckoutButton>
          ) : (
            <Button asChild variant="default" size="lg" className="mb-4 w-full">
              <Link to="/auth?next=/funding">
                Join the Collective
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}

          <a
            href={WHATSAPP_CONCIERGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex items-center justify-center gap-2 text-sm font-medium text-navy underline-offset-4 hover:text-navy-light hover:underline"
          >
            <MessageCircle className="h-4 w-4" /> Pay by transfer or mobile money
          </a>

          <ul className="space-y-4">
            {MEMBERSHIP_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-dark" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Access is activated automatically once payment is confirmed — usually under a minute. Paying by
        transfer or mobile money? We activate within 12 hours. Membership does not auto-renew.{" "}
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
