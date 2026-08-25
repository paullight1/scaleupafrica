import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { Button } from "@shared/components/ui/button";
import {
  readPaymentStatus,
  verifyPayment,
  type VerifyStatus,
} from "@/lib/bachs";
import { conciergeWhatsappUrl, BILLING_ROUTE } from "@/lib/billing";

type UiState = "verifying" | "success" | "pending" | "failed" | "missing";

const FAST_POLL_INTERVAL = 2_000;
const BACKGROUND_POLL_INTERVAL = 10_000;
const BACKGROUND_AFTER = 30_000;
const ACTIVATING_AFTER_SECONDS = 8;

/**
 * Bachs returns to this route with Cresciva's random payment `reference` that was
 * embedded into return_url at checkout creation. The reference is only a lookup
 * key — the browser redirect is never proof of payment. bachs-verify retrieves
 * the linked Bachs checkout server-side and revalidates settlement.
 */
export default function PaymentCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? "";
  const queryClient = useQueryClient();

  const [state, setState] = useState<UiState>(
    reference ? "verifying" : "missing",
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [providerCheckPending, setProviderCheckPending] = useState(false);
  const startedAtRef = useRef(0);
  const activeRef = useRef(false);
  const terminalRef = useRef(false);
  const providerBusyRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = useCallback(
    (status: VerifyStatus) => {
      if (!activeRef.current || status === "pending") return;
      terminalRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (status === "success") {
        setState("success");
        void queryClient.invalidateQueries({ queryKey: ["subscription"] });
        void queryClient.invalidateQueries({ queryKey: ["payments"] });
        return;
      }
      setState("failed");
    },
    [queryClient],
  );

  const checkProvider = useCallback(async () => {
    if (!reference || providerBusyRef.current || terminalRef.current) return;
    providerBusyRef.current = true;
    if (activeRef.current) setProviderCheckPending(true);
    try {
      finish(await verifyPayment(reference));
    } finally {
      providerBusyRef.current = false;
      if (activeRef.current && !terminalRef.current)
        setProviderCheckPending(false);
    }
  }, [finish, reference]);

  useEffect(() => {
    if (!reference) {
      setState("missing");
      return;
    }

    let cancelled = false;
    activeRef.current = true;
    terminalRef.current = false;
    providerBusyRef.current = false;
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setProviderCheckPending(false);
    setState("verifying");

    const pollLocalStatus = async () => {
      const status = await readPaymentStatus(reference);
      if (cancelled || !activeRef.current || terminalRef.current) return;
      if (status !== "pending") {
        finish(status);
        return;
      }

      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= BACKGROUND_AFTER) setState("pending");
      pollTimerRef.current = setTimeout(
        pollLocalStatus,
        elapsed < BACKGROUND_AFTER
          ? FAST_POLL_INTERVAL
          : BACKGROUND_POLL_INTERVAL,
      );
    };

    void pollLocalStatus();
    elapsedTimerRef.current = setInterval(() => {
      if (terminalRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1_000);
      setElapsedSeconds(elapsed);
      if (elapsed * 1_000 >= BACKGROUND_AFTER) setState("pending");
    }, 1_000);
    fallbackTimerRef.current = setTimeout(() => {
      void checkProvider();
    }, BACKGROUND_AFTER);

    return () => {
      cancelled = true;
      activeRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [checkProvider, finish, reference]);

  const activating =
    state === "verifying" && elapsedSeconds >= ACTIVATING_AFTER_SECONDS;
  const verifyingTitle = activating
    ? "Activating your membership…"
    : "Confirming your payment…";
  const verifyingBody = activating
    ? "Bachs is finishing the payment while Cresciva prepares your access."
    : "We're securely checking your payment record. You can keep this page open.";

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-secondary px-6 py-16">
      <SEO title="Payment status" noindex />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-elevated">
        {state === "verifying" && (
          <Panel
            icon={
              <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" />
            }
            tone="navy"
            title={verifyingTitle}
            body={verifyingBody}
            busy
          >
            <ElapsedTime seconds={elapsedSeconds} />
          </Panel>
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
                <Link to="/dashboard/funding">Open the Funding Radar</Link>
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
            body="Bachs is still finishing the payment in the background. You can safely leave this page; Cresciva will unlock your access when the signed confirmation arrives."
            busy
          >
            <ElapsedTime seconds={elapsedSeconds} />
            <div className="mt-6 flex flex-col gap-3">
              <Button
                size="lg"
                onClick={() => void checkProvider()}
                disabled={providerCheckPending}
              >
                {providerCheckPending ? "Checking Bachs…" : "Check with Bachs"}
              </Button>
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
            body="The payment was not confirmed, so membership access was not granted. You can try checkout again or contact the concierge for help."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to={BILLING_ROUTE}>Try again</Link>
              </Button>
              <Button asChild variant="navyOutline">
                <a
                  href={conciergeWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Contact payment support
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
            body="We couldn't find a Cresciva payment reference in this link. Open your billing page to check your membership or start checkout again."
          >
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to={BILLING_ROUTE}>Go to billing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/funding">Back to Funding</Link>
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function ElapsedTime({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return (
    <p
      aria-hidden="true"
      className="mt-5 font-mono text-sm font-semibold tabular-nums text-ink-strong"
    >
      {String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}{" "}
      elapsed
    </p>
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
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl ${toneClass}`}
      >
        {icon}
      </div>
      <h1 className="font-display text-2xl font-bold text-ink-strong">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
