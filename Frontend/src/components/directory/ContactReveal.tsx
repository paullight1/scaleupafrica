import { Button } from "@shared/components/ui/button";
import { Mail, Phone, MessageCircle, Lock } from "lucide-react";
import { waLink } from "@/lib/url";
import type { ProfileContact } from "@/hooks/queries/directory";

/**
 * Contact card with an explicit "Show contact details" reveal (Plan 04 §3.4 / §1.4).
 * The reveal is friction against casual scraping; the real control is the DB column-grant
 * revoke — anon reads never carry email/phone/whatsapp, they arrive only via the RPC that
 * `onReveal` triggers.
 */
export function ContactReveal({
  revealed,
  loading,
  contact,
  onReveal,
}: {
  revealed: boolean;
  loading: boolean;
  contact: ProfileContact | undefined;
  onReveal: () => void;
}) {
  const wa = waLink(contact?.whatsapp);
  const hasAny = !!(contact?.email || contact?.phone || contact?.whatsapp);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-1 font-display text-base font-semibold text-ink-strong">Contact</h2>

      {!revealed ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Contact details are shared by the founder.
          </p>
          <Button
            variant="default"
            className="min-h-[44px] w-full sm:w-auto"
            onClick={onReveal}
            disabled={loading}
            aria-expanded={false}
          >
            <Lock className="h-4 w-4" />
            {loading ? "Loading…" : "Show contact details"}
          </Button>
        </>
      ) : !hasAny ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          This founder hasn't shared direct contact — try the links above.
        </p>
      ) : (
        <div className="flex flex-col gap-2" aria-live="polite">
          {contact?.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-4 text-sm text-foreground hover:border-primary/40 hover:bg-secondary"
            >
              <Mail className="h-4 w-4 text-primary-dark" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {contact?.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-4 text-sm text-foreground hover:border-primary/40 hover:bg-secondary"
            >
              <Phone className="h-4 w-4 text-primary-dark" />
              <span className="truncate">{contact.phone}</span>
            </a>
          )}
          {contact?.whatsapp && wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-4 text-sm text-foreground hover:border-primary/40 hover:bg-secondary"
            >
              <MessageCircle className="h-4 w-4 text-primary-dark" />
              <span className="truncate">WhatsApp {contact.whatsapp}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default ContactReveal;
