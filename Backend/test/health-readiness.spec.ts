import { describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../src/health/health.controller";

describe("HealthController readiness", () => {
  it("reports Cresciva readiness when the database responds", async () => {
    const db = { execute: vi.fn().mockResolvedValue([{ one: 1 }]) } as never;
    const controller = new HealthController(db);

    await expect(controller.health()).resolves.toEqual({
      status: "ok",
      service: "cresciva-api",
      dependencies: { database: "ready" },
    });
  });

  it("fails readiness when the database is unavailable", async () => {
    const db = { execute: vi.fn().mockRejectedValue(new Error("db unavailable")) } as never;
    const controller = new HealthController(db);

    await expect(controller.health()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
