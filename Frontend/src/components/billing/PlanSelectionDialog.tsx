import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { cn } from "@shared/lib/utils";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { formatPlanPrice, type PlanCode } from "@/lib/billing";

const PLAN_OPTIONS: Array<{
  code: PlanCode;
  name: string;
  cadence: string;
  note: string;
  badge?: string;
}> = [
  { code: "monthly", name: "Monthly", cadence: "every month", note: "Flexible month-to-month access" },
  { code: "quarterly", name: "Quarterly", cadence: "every 3 months", note: "Save $5 each quarter" },
  { code: "annual", name: "Annual", cadence: "per year", note: "Save $30 across the year", badge: "Best value" },
];

interface PlanSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanSelectionDialog({ open, onOpenChange }: PlanSelectionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("annual");
  const selectedName = PLAN_OPTIONS.find((plan) => plan.code === selectedPlan)?.name ?? "Annual";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-surface-subtle px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="font-display text-2xl text-ink-strong">Choose your membership</DialogTitle>
          <DialogDescription>
            Every plan unlocks the complete Funding Radar. Pick the billing cycle that suits you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
          <fieldset>
            <legend className="sr-only">Membership billing cycle</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLAN_OPTIONS.map((plan) => {
                const selected = selectedPlan === plan.code;
                return (
                  <label
                    key={plan.code}
                    className={cn(
                      "relative cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                      selected
                        ? "border-primary-dark bg-primary/5 shadow-soft"
                        : "border-border bg-card hover:border-navy/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="membership-plan"
                      value={plan.code}
                      checked={selected}
                      onChange={() => setSelectedPlan(plan.code)}
                      aria-label={`${plan.name} plan`}
                      className="sr-only"
                    />
                    <div className="flex min-h-6 items-start justify-between gap-2">
                      <span className="font-semibold text-ink-strong">{plan.name}</span>
                      {plan.badge ? <Badge variant="success">{plan.badge}</Badge> : null}
                    </div>
                    <p className="mt-4 font-display text-2xl font-bold text-navy">
                      {formatPlanPrice(plan.code, "USD")}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.cadence}</p>
                    <p className="mt-3 text-xs leading-5 text-foreground">{plan.note}</p>
                    {selected ? (
                      <CheckCircle2 className="absolute bottom-3 right-3 h-4 w-4 text-primary-dark" aria-hidden="true" />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-lg bg-navy px-4 py-3 text-sm text-white">
            Full Funding Radar access, member resources, and recurring billing through Bachs.
          </div>

          <CheckoutButton
            currency="USD"
            planCode={selectedPlan}
            next="/dashboard/account/membership"
            className="w-full"
          >
            Continue with {selectedName.toLowerCase()}
          </CheckoutButton>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            Your plan renews automatically at the selected interval. You can cancel before the next renewal in the Bachs billing portal.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlanSelectionDialog;
