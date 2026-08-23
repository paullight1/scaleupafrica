import { describe, it, expect } from "vitest";
import { RolesService } from "../src/auth/roles.service";
import type { Db } from "../src/db/client";

function mockDb(rows: { role: string }[], counter: { n: number }): Db {
  const where = (..._a: unknown[]) => {
    counter.n++;
    return Promise.resolve(rows);
  };
  const from = () => ({ where });
  const select = () => ({ from });
  return { select } as unknown as Db;
}

describe("RolesService", () => {
  it("returns roles for a user", async () => {
    const counter = { n: 0 };
    const svc = new RolesService(mockDb([{ role: "admin" }, { role: "editor" }], counter));
    expect(await svc.getRoles("u1")).toEqual(["admin", "editor"]);
  });

  it("hasAny matches on any required role", async () => {
    const svc = new RolesService(mockDb([{ role: "editor" }], { n: 0 }));
    expect(await svc.hasAny("u1", ["admin", "editor"])).toBe(true);
    expect(await svc.hasAny("u1", ["admin"])).toBe(false);
  });

  it("caches within the TTL (only one DB hit for repeated lookups)", async () => {
    const counter = { n: 0 };
    const svc = new RolesService(mockDb([{ role: "user" }], counter));
    await svc.getRoles("u1");
    await svc.getRoles("u1");
    await svc.getRoles("u1");
    expect(counter.n).toBe(1);
  });

  it("re-queries after clear()", async () => {
    const counter = { n: 0 };
    const svc = new RolesService(mockDb([{ role: "user" }], counter));
    await svc.getRoles("u1");
    svc.clear();
    await svc.getRoles("u1");
    expect(counter.n).toBe(2);
  });
});
