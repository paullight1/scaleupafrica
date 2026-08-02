import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { userRoles } from "../db/schema";
import type { AppRoleName } from "./types";

const TTL_MS = 60_000;

/**
 * Role lookup with a 60s in-memory TTL cache (roles change rarely; this bounds DB
 * chatter). Mirrors SQL has_role()/is_admin()/is_staff(): staff = admin || editor.
 */
@Injectable()
export class RolesService {
  private cache = new Map<string, { roles: AppRoleName[]; at: number }>();

  constructor(@Inject(DB) private readonly db: Db) {}

  async getRoles(userId: string): Promise<AppRoleName[]> {
    const hit = this.cache.get(userId);
    const now = Date.now();
    if (hit && now - hit.at < TTL_MS) return hit.roles;

    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const roles = rows.map((r) => r.role as AppRoleName);
    this.cache.set(userId, { roles, at: now });
    return roles;
  }

  async hasAny(userId: string, required: AppRoleName[]): Promise<boolean> {
    const roles = await this.getRoles(userId);
    return required.some((r) => roles.includes(r));
  }

  /** Test/ops hook. */
  clear(): void {
    this.cache.clear();
  }
}
