import { z } from "zod";

/**
 * Subscription contract. `active` is the single canonical runtime rule
 * (FOUNDATION §8.3) — computed by the API's SubscriptionsService.isActive() and
 * mirrored in SQL has_active_subscription() + FE src/lib/subscription.ts.
 */
export const SubscriptionSchema = z.object({
  hasAccess: z.boolean(),
  expiresAt: z.string().nullable(),
  active: z.boolean(),
});
export type SubscriptionDto = z.infer<typeof SubscriptionSchema>;
