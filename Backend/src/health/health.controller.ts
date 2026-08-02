import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { Public } from "../auth/decorators";

@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get()
  async health(): Promise<{ ok: boolean; db: boolean }> {
    let dbOk = false;
    try {
      await this.db.execute(sql`select 1`);
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return { ok: true, db: dbOk };
  }
}
