import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { Public } from "../auth/decorators";

export type HealthResponse = {
  status: "ok";
  service: "cresciva-api";
  dependencies: { database: "ready" };
};

@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get()
  async health(): Promise<HealthResponse> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: "cresciva-api",
        dependencies: { database: "unavailable" },
      });
    }

    return {
      status: "ok",
      service: "cresciva-api",
      dependencies: { database: "ready" },
    };
  }
}
