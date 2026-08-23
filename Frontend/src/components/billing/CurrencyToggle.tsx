import { cn } from "@shared/lib/utils";
import { CURRENCY_META, SUPPORTED_CURRENCIES, type Currency } from "@/lib/billing";

interface CurrencyToggleProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
}

/** Currency control retained for compatibility; recurring Cresciva plans currently use USD. */
export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Payment currency"
      className={cn("inline-flex rounded-lg border border-border bg-card p-1", className)}
    >
      {SUPPORTED_CURRENCIES.map((currency) => {
        const active = currency === value;
        return (
          <button
            key={currency}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(currency)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-ink-strong",
            )}
          >
            <span aria-hidden="true">{CURRENCY_META[currency].symbol}</span> {currency}
          </button>
        );
      })}
    </div>
  );
}

export default CurrencyToggle;
