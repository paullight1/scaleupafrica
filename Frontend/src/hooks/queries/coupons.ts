import { supabase } from "@shared/integrations/supabase/client";
import { normalizeCouponCode } from "@shared/lib/coupons";

export async function redeemCoupon(code: string) {
  const { data, error } = await supabase.rpc("redeem_membership_coupon", { _code: normalizeCouponCode(code) });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.access_expires_at !== "string" || !Number.isFinite(Date.parse(data.access_expires_at)) || typeof data.already_redeemed !== "boolean") throw new Error("Could not confirm your coupon. Please try again.");
  return { access_expires_at: data.access_expires_at, already_redeemed: data.already_redeemed };
}
