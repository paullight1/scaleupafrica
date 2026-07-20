import { apiRequest } from "./client";
import type { SubscriptionDto } from "./types";

export function getMySubscription(): Promise<SubscriptionDto> {
  return apiRequest<SubscriptionDto>("/subscriptions/me");
}
