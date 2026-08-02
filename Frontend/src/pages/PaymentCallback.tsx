import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Loader2, MessageCircle } from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { Button } from "@shared/components/ui/button";
import { verifyPayment, type VerifyStatus } from "@/lib/paystack";
import { conciergeWhatsappUrl, BILLING_ROUTE } from "@/lib/billing";

type UiState = "verifying" | "success" | "pending" | "failed" | "missing";

const MAX_POLLS = 6; // ~6 attempts over ~60s for lagging bank-transfer/USSD channels
const POLL_INTERVAL = 10_000;

/**
 * Post-checkout landing page (route: /payment/callback). Reads the Paystack
 * reference (Paystack sends `reference` and/or `trxref`), verifies it server-side,
 * and shows success / pending / failed states — then routes back to /funding.
 */
export default function PaymentCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const queryClient = useQueryClient();

  const [state, setState] = useState<UiState>(reference ? "verifying" : "missing");
  const pollsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runVerify = useCallback(async () => {
    if (!reference) {
      setState("missing");
      return;
    }
    const status: VerifyStatus = await verifyPayment(reference);
    if (status === "success") {
      setState("success");
      // Unlock /funding & billing without a reload.
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      return;
    }
    if (status === "failed") {
      setState("failed");
      return;
    }
    // pending → poll a few times, then rest on pending.
    if (pollsRef.current < MAX_POLLS) {
      pollsRef.current += 1;
      setState("verifying");
      timerRef.current = setTimeout(runVerify, POLL_INTERVAL);
    } else {
      setState("pending");
    }
  }, [reference, queryClient]);

  useEffect(() => {
    runVerify();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runVerify]);

  const retry = () => {
    pollsRef.current = 0;
    setState("verifying");
    runVerify();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-secondary px-6 py-16">
      <SEO title="Payment status" noindex />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-elevated">
        {state === "verifying" && (
          <Panel
            icon={<Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" />}
            tone="navy"
            title="Confirming your payment…"
            body="Hang tight — we're verifying your transaction with Paystack. This usually takes a few seconds."
            busy
          />
        )}

        {state === "success" && (
          <Panel
            icon={<CheckCircle2 className="h-8 w-8" />}
            tone="success"
            title="You're in!"
            body="Your membership is active. The Funding Radar is unlocked."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/funding">Open the Funding Radar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={BILLING_ROUTE}>View membership</Link>
              </Button>
            </div>
          </Panel>
        )}

        {state === "pending" && (
          <Panel
            icon={<Clock className="h-8 w-8" />}
            tone="navy"
            title="Payment is processing"
            body="Some bank transfers and mobile-money payments take a little longer to settle. We'll unlock your access the moment it clears — you can safely close this page and check back, or refresh to re-check now."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button size="lg" onClick={retry}>Check again</Button>
              <Button asChild variant="outline">
                <Link to={BILLING_ROUTE}>Go to billing</Link>
              </Button>
            </div>
          </Panel>
        )}

        {state === "failed" && (
          <Panel
            icon={<XCircle className="h-8 w-8" />}
            tone="destructive"
            title="Payment didn't go through"
            body="Your card or transfer wasn't completed and you have not been charged for membership. You can try again, or pay by transfer / mobile money via the concierge."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/funding">Try again</Link>
              </Button>
              <Button asChild variant="navyOutline">
                <a href={conciergeWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Pay via WhatsApp concierge
                </a>
              </Button>
            </div>
          </Panel>
        )}

        {state === "missing" && (
          <Panel
            icon={<XCircle className="h-8 w-8" />}
            tone="destructive"
            title="No payment to confirm"
            body="We couldn't find a payment reference in this link. If you just paid, open your billing page to check your status."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to={BILLING_ROUTE}>Go to billing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/funding">Back to Funding</Link>
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({
  icon,
  tone,
  title,
  body,
  busy,
  children,
}: {
  icon: React.ReactNode;
  tone: "navy" | "success" | "destructive";
  title: string;
  body: string;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success-strong"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive-strong"
        : "bg-navy text-white";
  return (
    <div role="status" aria-live="polite" aria-busy={busy ? "true" : undefined}>
      <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <h1 className="font-display text-2xl font-bold text-ink-strong">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
