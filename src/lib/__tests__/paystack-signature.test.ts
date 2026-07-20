import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  computeHmacSha512Hex,
  timingSafeEqualHex,
  verifyPaystackSignature,
} from "../../../supabase/functions/_shared/paystack";

// Reference fixtures computed with Node's crypto (independent of the impl under test).
const SECRET = "sk_test_deadbeef";
const BODY = JSON.stringify({ event: "charge.success", data: { reference: "sua_123", amount: 20000, currency: "USD", status: "success" } });

function nodeHmac(body: string, secret: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

describe("HMAC-SHA512 signature verification", () => {
  it("computeHmacSha512Hex matches Node's crypto for the same key + body", async () => {
    const expected = nodeHmac(BODY, SECRET);
    await expect(computeHmacSha512Hex(BODY, SECRET)).resolves.toBe(expected);
  });

  it("accepts a valid signature over the exact raw body", async () => {
    const sig = nodeHmac(BODY, SECRET);
    await expect(verifyPaystackSignature(BODY, sig, SECRET)).resolves.toBe(true);
  });

  it("rejects a tampered body (signature no longer matches)", async () => {
    const sig = nodeHmac(BODY, SECRET);
    const tampered = BODY.replace("20000", "1"); // attacker lowers the amount
    await expect(verifyPaystackSignature(tampered, sig, SECRET)).resolves.toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const sig = nodeHmac(BODY, "sk_test_wrong");
    await expect(verifyPaystackSignature(BODY, sig, SECRET)).resolves.toBe(false);
  });

  it("rejects a missing / empty signature header", async () => {
    await expect(verifyPaystackSignature(BODY, "", SECRET)).resolves.toBe(false);
    await expect(verifyPaystackSignature(BODY, null, SECRET)).resolves.toBe(false);
    await expect(verifyPaystackSignature(BODY, undefined, SECRET)).resolves.toBe(false);
  });

  it("rejects when the secret is empty", async () => {
    const sig = nodeHmac(BODY, SECRET);
    await expect(verifyPaystackSignature(BODY, sig, "")).resolves.toBe(false);
  });
});

describe("timingSafeEqualHex", () => {
  it("returns true only for identical equal-length strings", () => {
    expect(timingSafeEqualHex("abcdef", "abcdef")).toBe(true);
    expect(timingSafeEqualHex("abcdef", "abcde0")).toBe(false);
  });

  it("is length-safe (unequal lengths never match, no throw)", () => {
    expect(timingSafeEqualHex("abc", "abcd")).toBe(false);
    expect(timingSafeEqualHex("", "a")).toBe(false);
  });
});
