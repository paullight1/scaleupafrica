import { describe, it, expect } from "vitest";
import { Reflector } from "@nestjs/core";
import { UnauthorizedException, ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { SupabaseJwtGuard } from "../src/auth/supabase-jwt.guard";
import { RolesGuard } from "../src/auth/roles.guard";
import { RolesService } from "../src/auth/roles.service";
import { SupabaseJwtVerifier } from "../src/auth/jwt-verifier";
import { signHs256, TEST_SUPABASE_URL, TEST_SECRET, TEST_SUB } from "./jwt-fixtures";
import { IS_PUBLIC_KEY, ROLES_KEY } from "../src/auth/decorators";

function ctx(req: Record<string, unknown>, meta: Record<string, unknown> = {}): ExecutionContext {
  const handler = () => undefined;
  Object.assign(handler, meta); // Reflector reads metadata off the handler
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

const verifier = new SupabaseJwtVerifier({ supabaseUrl: TEST_SUPABASE_URL, jwtSecret: TEST_SECRET });

// Reflector that reads our fake metadata bag stored on the handler fn.
const reflector = {
  getAllAndOverride: (key: string, [handler]: [{ [k: string]: unknown }]) => handler?.[key],
} as unknown as Reflector;

describe("SupabaseJwtGuard", () => {
  const guard = new SupabaseJwtGuard(reflector, verifier);

  it("allows @Public() routes with no token", async () => {
    const req: Record<string, unknown> = { headers: {} };
    await expect(guard.canActivate(ctx(req, { [IS_PUBLIC_KEY]: true }))).resolves.toBe(true);
  });

  it("rejects a missing Authorization header", async () => {
    await expect(guard.canActivate(ctx({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a non-Bearer scheme", async () => {
    await expect(
      guard.canActivate(ctx({ headers: { authorization: "Basic abc" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches req.user for a valid token", async () => {
    const token = await signHs256();
    const req: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect((req.user as { id: string }).id).toBe(TEST_SUB);
  });

  it("rejects an invalid token", async () => {
    const req = { headers: { authorization: "Bearer not.a.jwt" } };
    await expect(guard.canActivate(ctx(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("RolesGuard", () => {
  function rolesServiceWith(roles: string[]): RolesService {
    return { hasAny: async (_id: string, req: string[]) => req.some((r) => roles.includes(r)) } as unknown as RolesService;
  }

  it("passes through when no @Roles metadata", async () => {
    const guard = new RolesGuard(reflector, rolesServiceWith([]));
    await expect(guard.canActivate(ctx({ user: { id: TEST_SUB } }))).resolves.toBe(true);
  });

  it("allows an admin on @Roles('admin')", async () => {
    const guard = new RolesGuard(reflector, rolesServiceWith(["admin"]));
    const c = ctx({ user: { id: TEST_SUB } }, { [ROLES_KEY]: ["admin"] });
    await expect(guard.canActivate(c)).resolves.toBe(true);
  });

  it("forbids a plain user on @Roles('admin')", async () => {
    const guard = new RolesGuard(reflector, rolesServiceWith(["user"]));
    const c = ctx({ user: { id: TEST_SUB } }, { [ROLES_KEY]: ["admin"] });
    await expect(guard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
