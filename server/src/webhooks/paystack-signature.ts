import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack webhook auth: signature = HMAC-SHA512(secretKey, rawBody), compared to
 * the `x-paystack-signature` header with a constant-time comparison. The RAW request
 * body (pre-JSON-parse) must be used — see main.ts `rawBody: true`.
 */
export function verifyPaystackSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secretKey: string,
): boolean {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha512", secretKey)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
