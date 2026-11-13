import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as couponClient } from "@shared/integrations/supabase/client";
import { normalizeCouponCode, type CouponExpiry } from "@shared/lib/coupons";

export const COUPON_PAGE_SIZE = 24;
export function useAdminCoupons(page: number, search: string) {
  return useQuery({
    queryKey: ["admin-coupons", page, search],
    queryFn: async () => {
      let query = couponClient.from("membership_coupons").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id");
      const term = normalizeCouponCode(search).replace(/[^A-Z0-9-]/g, "");
      if (term) query = query.ilike("code", `%${term}%`);
      const { data, count, error } = await query.range(page * COUPON_PAGE_SIZE, (page + 1) * COUPON_PAGE_SIZE - 1);
      if (error) throw error;
      return { coupons: data ?? [], total: count ?? 0 };
    },
  });
}
export function useGenerateCoupons() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ count, expiry, unlimited, code }: { count: number; expiry: CouponExpiry; unlimited: boolean; code: string }) => {
      const { data, error } = await couponClient.rpc("admin_generate_membership_coupons", { _count: count, _expiry: expiry, _unlimited: unlimited, ...(code.trim() ? { _code: normalizeCouponCode(code) } : {}) });
      if (error) throw new Error(error.code === "23505" ? "That code already exists. Choose another code." : error.message);
      if (!data?.length) throw new Error("No coupons were returned. Refresh the list before trying again.");
      return data;
    },
    retry: false,
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin-coupons"] }); },
  });
}
export function useRevokeCoupon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await couponClient.rpc("admin_revoke_membership_coupon", { _coupon_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin-coupons"] }); },
  });
}
