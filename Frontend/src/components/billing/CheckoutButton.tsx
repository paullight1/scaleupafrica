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
 * Single entry point to Paystack hosted checkout. The browser never sees provider
 * secrets or controls the amount; usePaystackCheckout asks paystack-init to create a
 * server-priced session and redirects to the returned checkout URL.
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
