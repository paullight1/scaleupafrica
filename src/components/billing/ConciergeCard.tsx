import { MessageCircle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { conciergeWhatsappUrl } from "@/lib/billing";

/**
 * Permanent, first-class concierge lane (Plan 06 §5.7). Covers users Paystack's
 * card rails can't serve — mobile-money outside Nigeria, bank transfer — via a
 * human on WhatsApp. Honest: activation within 12 hours, not "instant".
 */
export function ConciergeCard() {
  const { user } = useAuth();
  const whatsappUrl = conciergeWhatsappUrl(user?.email ?? undefined);

  return (
    <section
      aria-labelledby="concierge-heading"
      className="rounded-xl border border-border bg-surface-subtle p-6 shadow-soft"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 id="concierge-heading" className="font-display text-lg font-semibold text-ink-strong">
            Prefer bank transfer or mobile money?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Message us on WhatsApp with your payment. A human confirms it and activates your membership
            within 12 hours — no card required.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="navy">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" /> Message us on WhatsApp
          </a>
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
        <span>
          We'll reply with bank-transfer or mobile-money details. Never pay anyone claiming to be us
          outside these official channels.
        </span>
      </p>
    </section>
  );
}

export default ConciergeCard;
