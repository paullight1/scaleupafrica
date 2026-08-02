import { describe, it, expect } from "vitest";
import { SupabaseJwtVerifier, JwtVerifyError } from "../src/auth/jwt-verifier";
import { signHs256, TEST_SUPABASE_URL, TEST_SECRET, TEST_SUB, TEST_ISSUER } from "./jwt-fixtures";

const verifier = new SupabaseJwtVerifier({ supabaseUrl: TEST_SUPABASE_URL, jwtSecret: TEST_SECRET });

describe("SupabaseJwtVerifier (HS256)", () => {
  it("verifies a valid token and returns the user id + email", async () => {
    const token = await signHs256();
    const user = await verifier.verify(token);
    expect(user.id).toBe(TEST_SUB);
    expect(user.email).toBe("founder@example.com");
  });

  it("rejects an expired token", async () => {
    const token = await signHs256({ expSecondsFromNow: -60 });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("rejects a wrong audience", async () => {
    const token = await signHs256({ audience: "anon" });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("rejects a wrong issuer", async () => {
    const token = await signHs256({ issuer: "https://evil.example.com/auth/v1" });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("rejects a non-UUID sub", async () => {
    const token = await signHs256({ sub: "not-a-uuid" });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("rejects garbage / malformed input", async () => {
    await expect(verifier.verify("garbage.token.here")).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("rejects an HS256 token when no secret is configured", async () => {
    const noSecret = new SupabaseJwtVerifier({ supabaseUrl: TEST_SUPABASE_URL });
    const token = await signHs256();
    await expect(noSecret.verify(token)).rejects.toBeInstanceOf(JwtVerifyError);
  });

  it("builds the issuer from the supabase url", () => {
    expect(TEST_ISSUER).toBe(`${TEST_SUPABASE_URL}/auth/v1`);
  });
});
