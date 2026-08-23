import { MessageCircle, Landmark } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { useAuth } from "@shared/hooks/useAuth";
import { conciergeWhatsappUrl } from "@/lib/billing";

/**
 * Billing support lane for questions about recurring Bachs membership payments.
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
            Need help with billing?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Message us on WhatsApp if you have a question about your recurring membership or Bachs billing.
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
          Never share card details in chat. We will help you use the official Bachs checkout or billing portal.
        </span>
      </p>
    </section>
  );
}

export default ConciergeCard;
