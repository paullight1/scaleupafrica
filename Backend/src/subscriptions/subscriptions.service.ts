import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { subscriptions } from "../db/schema";
import type { SubscriptionDto } from "../contracts";

/**
 * The SINGLE runtime home of the active-subscription rule (FOUNDATION §8.3):
 * has_access === true AND (expires_at is null OR expires_at > now). Funding
 * endpoints and the DTO `active` field both call isActive().
 */
@Injectable()
export class SubscriptionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  isActive(row: { hasAccess: boolean; expiresAt: Date | string | null } | null, now = new Date()): boolean {
    if (!row?.hasAccess) return false;
    if (!row.expiresAt) return true;
    const exp = row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
    return exp > now;
  }

  async getMine(userId: string): Promise<SubscriptionDto> {
    const [row] = await this.db
      .select({ hasAccess: subscriptions.hasAccess, expiresAt: subscriptions.expiresAt })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!row) return { hasAccess: false, expiresAt: null, active: false };
    return {
      hasAccess: row.hasAccess,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      active: this.isActive(row),
    };
  }

  /** Used by FundingService to gate access. */
  async isActiveForUser(userId: string): Promise<boolean> {
    const dto = await this.getMine(userId);
    return dto.active;
  }
}
