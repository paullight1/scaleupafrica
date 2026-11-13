import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Ticket } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { normalizeCouponCode } from "@shared/lib/coupons";
import { redeemCoupon } from "@/hooks/queries/coupons";

export function CouponRedeemCard({ onRedeemed }: { onRedeemed?: () => void }) {
  const [params] = useSearchParams();
  const inputId = useId();
  const [code, setCode] = useState(() => (params.get("coupon") ?? "").slice(0, 32));
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (value: string) => redeemCoupon(value),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["subscription"] });
      onRedeemed?.();
    },
  });
  const receiptExpired = mutation.data && new Date(mutation.data.access_expires_at) <= new Date();

  return (
    <section aria-label="Redeem membership coupon" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-strong"><Ticket className="h-5 w-5 text-primary-dark" aria-hidden="true" /> Have a guest pass?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Redeem a Cresciva coupon for 7 days of free membership. No card required, no automatic charge.</p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); if (code.trim() && !mutation.isPending) mutation.mutate(normalizeCouponCode(code)); }}>
        <div className="flex-1">
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium">Coupon code</label>
          <Input id={inputId} value={code} onChange={(event) => { setCode(event.target.value); mutation.reset(); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} placeholder="Enter your code" required disabled={mutation.isPending} className="font-mono uppercase" aria-describedby={mutation.isError ? `${inputId}-error` : undefined} />
        </div>
        <Button type="submit" disabled={!code.trim() || mutation.isPending}>{mutation.isPending ? "Redeeming…" : "Redeem coupon"}</Button>
      </form>
      {mutation.isError && <p id={`${inputId}-error`} role="alert" className="mt-3 text-sm text-destructive-strong">{mutation.error instanceof Error ? mutation.error.message : "Couldn't redeem your coupon. Please try again."}</p>}
      {mutation.data && <p role="status" className="mt-3 text-sm text-success-strong">{receiptExpired ? "You already redeemed this coupon. Its free access ended on " : mutation.data.already_redeemed ? "You already redeemed this coupon. Your access was granted until " : "Your membership is active until "}{new Date(mutation.data.access_expires_at).toLocaleString()}. {!mutation.data.already_redeemed && "Your 7 free days have been added."}</p>}
      <p className="mt-3 text-xs text-muted-foreground">Each coupon can be redeemed once per account. If you already have paid access, we add the free days to it.</p>
    </section>
  );
}
