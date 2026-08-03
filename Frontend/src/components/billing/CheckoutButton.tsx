import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@shared/components/ui/button";
import { usePaystackCheckout } from "@/lib/paystack";
import type { Currency, PlanCode } from "@/lib/billing";

interface CheckoutButtonProps extends Omit<ButtonProps, "onClick"> {
  currency: Currency;
  planCode?: PlanCode;
  /** Return path after auth if the user isn't signed in. */
  next?: string;
  /** Button label (defaults to "Pay with Paystack"). */
  children?: React.ReactNode;
}

/**
 * Single entry point to Paystack checkout. Handles: not-signed-in redirect,
 * typed init errors (ALREADY_ACTIVE / CURRENCY_UNAVAILABLE), and the redirect to
 * the hosted page — all inside usePaystackCheckout. Never a dead end.
 */
export function CheckoutButton({
  currency,
  planCode = "annual",
  next = "/dashboard/funding",
  children,
  size = "lg",
  variant = "default",
  disabled,
  ...rest
}: CheckoutButtonProps) {
  const { startCheckout, isPending } = usePaystackCheckout();

  return (
    <Button
      size={size}
      variant={variant}
      disabled={disabled || isPending}
      aria-busy={isPending}
      onClick={() => startCheckout({ plan_code: planCode, currency, next })}
      {...rest}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Redirecting…
        </>
      ) : (
        children ?? "Pay with Paystack"
      )}
    </Button>
  );
}

export default CheckoutButton;
