// =============================================================================
// Paystack helpers — pure TypeScript (Web Crypto + fetch only, NO Deno globals)
// so the security-critical logic is unit-testable under Vitest (Node) even
// though the functions deploy on Deno. See src/lib/__tests__/paystack-signature.test.ts.
// =============================================================================

export const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackResult<T = any> {
  ok: boolean;
  status: number;
  json: T;
}

/**
 * Thin wrapper over the Paystack REST API. The secret key is passed in (never
 * read from a global here) and never logged.
 */
export async function paystackFetch<T = any>(
  path: string,
  secretKey: string,
  init: RequestInit = {},
): Promise<PaystackResult<T>> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, json: json as T };
}

/** HMAC-SHA512 of `rawBody` keyed by `secret`, lowercase hex. */
export async function computeHmacSha512Hex(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Constant-time hex-string comparison. Length-checks first (both are fixed-length
 * SHA-512 hex, so length is not secret), then XOR-accumulates every char code so
 * the loop never short-circuits on the first mismatch.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify the `x-paystack-signature` header against the RAW request body.
 * Missing/empty signature always fails. Compare is timing-safe.
 */
export async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await computeHmacSha512Hex(rawBody, secret);
  return timingSafeEqualHex(expected, signature.trim().toLowerCase());
}

// --- Decision helpers (pure) --------------------------------------------------

export interface PaymentRowLite {
  amount: number | string;
  currency: string;
  status: string;
}

export interface PaystackChargeData {
  amount?: number | string;
  currency?: string;
  status?: string;
  channel?: string;
  paid_at?: string;
  reference?: string;
}

/**
 * Amount + currency revalidation. A signature-valid event for a tampered/lesser
 * charge, or a cross-transaction confusion, must NOT match. Amounts compared as
 * integers, currency case-insensitively.
 */
export function chargeMatchesPayment(data: PaystackChargeData, payment: PaymentRowLite): boolean {
  const dataAmount = Number(data.amount);
  const payAmount = Number(payment.amount);
  if (!Number.isFinite(dataAmount) || !Number.isFinite(payAmount)) return false;
  if (dataAmount !== payAmount) return false;
  return String(data.currency ?? "").toUpperCase() === String(payment.currency ?? "").toUpperCase();
}

export type VerifyStatus = "success" | "pending" | "failed";

/** Map Paystack transaction status → our tri-state. */
export function mapPaystackStatus(status: unknown): VerifyStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "success") return "success";
  if (s === "failed" || s === "abandoned" || s === "reversed") return "failed";
  return "pending"; // ongoing / pending / send_otp / send_pin / queued, etc.
}

export type GrantAction = "grant" | "ignore" | "mismatch" | "already";

/**
 * Decide, purely, what to do with a charge event/verification given the stored
 * payment row. Encapsulates the security invariants for testability:
 *  - only actionable for charge.success + Paystack status "success"
 *  - amount + currency MUST match the server-created row (else "mismatch", no grant)
 *  - if the row is already "success" → "already" (idempotent no-op)
 */
export function decideChargeGrant(
  eventType: string,
  data: PaystackChargeData,
  payment: PaymentRowLite | null | undefined,
): { action: GrantAction } {
  if (eventType !== "charge.success") return { action: "ignore" };
  if (!payment) return { action: "ignore" };
  if (String(data.status ?? "").toLowerCase() !== "success") return { action: "ignore" };
  if (!chargeMatchesPayment(data, payment)) return { action: "mismatch" };
  if (payment.status === "success") return { action: "already" };
  return { action: "grant" };
}
