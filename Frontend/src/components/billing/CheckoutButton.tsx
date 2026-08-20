import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@shared/components/ui/button";
import { useBachsCheckout } from "@/lib/bachs";
import type { Currency, PlanCode } from "@/lib/billing";

interface CheckoutButtonProps extends Omit<ButtonProps, "onClick"> {
  currency: Currency;
  planCode?: PlanCode;
  /** Return path after auth if the user isn't signed in. */
  next?: string;
  /** Button label (defaults to "Pay with Bachs"). */
  children?: React.ReactNode;
}

/**
 * Single entry point to Bachs hosted checkout. The browser never sees provider
 * secrets or controls the amount; useBachsCheckout asks bachs-init to create a
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
  const { startCheckout, isPending } = useBachsCheckout();

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
        children ?? "Pay with Bachs"
      )}
    </Button>
  );
}

export default CheckoutButton;
