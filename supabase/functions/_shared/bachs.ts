// =============================================================================
// Bachs payment helpers — pure TypeScript using Web Crypto + fetch only.
//
// Cresciva stores money internally as integer subunits (kobo/cents). Bachs API
// money is ALWAYS a decimal string at the currency's precision. Conversion is
// isolated here so database/accounting code never switches to floating point.
// =============================================================================

export const BACHS_SANDBOX_BASE_URL = "https://sandbox-api.bachs.io";
export const BACHS_LIVE_BASE_URL = "https://api.bachs.io";
export const BACHS_WEBHOOK_TOLERANCE_SECONDS = 300;

const CURRENCY_DECIMALS = {
  NGN: 2,
  USD: 2,
} as const;

export type BachsSupportedCurrency = keyof typeof CURRENCY_DECIMALS;

export interface BachsResult<T = unknown> {
  ok: boolean;
  status: number;
  json: T;
}

export interface BachsCheckout {
  checkout_id: string;
  status?: string | null;
  payment_status?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference?: string | null;
  payment_method?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  charge?: {
    payment_id?: string | null;
    status?: string | null;
    amount?: string | null;
    currency?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface BachsWebhookEvent {
  id: string;
  type: string;
  created_at?: string | null;
  organization_id?: string | null;
  data?: Record<string, unknown> | null;
}

export interface CrescivaPaymentLite {
  amount: number | string;
  currency: string;
  status: string;
}

export type GrantAction = "grant" | "already" | "mismatch" | "ignore";
export type WebhookInsertOutcome = "duplicate" | "retry" | "none";

/**
 * Convert integer subunits to the decimal string Bachs expects, without using
 * floating-point division. Throws for unsupported currencies or unsafe values.
 */
export function subunitsToDecimal(
  amount: number,
  currency: string,
): string {
  const decimals = currencyDecimals(currency);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative safe integer in subunits.");
  }

  const factor = 10 ** decimals;
  const whole = Math.floor(amount / factor);
  const fraction = String(amount % factor).padStart(decimals, "0");
  return `${whole}.${fraction}`;
}

/**
 * Convert a Bachs decimal-string amount back to Cresciva integer subunits.
 * Returns null for malformed, negative, over-precision, or unsafe values.
 */
export function decimalToSubunits(
  value: string,
  currency: string,
): number | null {
  let decimals: number;
  try {
    decimals = currencyDecimals(currency);
  } catch {
    return null;
  }

  if (typeof value !== "string") return null;
  const match = new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`).exec(value.trim());
  if (!match) return null;

  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) return null;

  const fractionRaw = (match[2] ?? "").padEnd(decimals, "0");
  const fraction = fractionRaw ? Number(fractionRaw) : 0;
  const factor = 10 ** decimals;
  const result = whole * factor + fraction;
  return Number.isSafeInteger(result) ? result : null;
}

function currencyDecimals(currency: string): number {
  const normalized = currency.toUpperCase() as BachsSupportedCurrency;
  const decimals = CURRENCY_DECIMALS[normalized];
  if (decimals == null) throw new Error(`Unsupported Bachs currency: ${currency}`);
  return decimals;
}

/** HMAC-SHA256 of the exact message, lowercase hex. */
export async function computeHmacSha256Hex(
  message: string,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToHex(new Uint8Array(digest));
}

/** Constant-time comparison for equal-length hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify Bachs X-Bachs-Timestamp + X-Bachs-Signature.
 * Bachs signs `${timestamp}.${raw_body}` with HMAC-SHA256 and recommends a
 * 300-second freshness tolerance to reject replayed deliveries.
 */
export async function verifyBachsSignature(
  rawBody: string,
  timestampHeader: string | null | undefined,
  signatureHeader: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = BACHS_WEBHOOK_TOLERANCE_SECONDS,
): Promise<boolean> {
  if (!timestampHeader || !signatureHeader || !secret) return false;
  if (!/^\d+$/.test(timestampHeader.trim())) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp)) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = await computeHmacSha256Hex(
    `${timestampHeader.trim()}.${rawBody}`,
    secret,
  );
  const actual = signatureHeader.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(actual)) return false;
  return timingSafeEqualHex(expected, actual);
}

/** Only PostgreSQL unique-violation means a duplicate webhook delivery. */
export function classifyWebhookInsertError(
  error: { code?: string | null } | null,
): WebhookInsertOutcome {
  if (!error) return "none";
  return error.code === "23505" ? "duplicate" : "retry";
}

/**
 * Decide whether a retrieved Bachs checkout can grant the stored Cresciva
 * payment. The provider result must be settled AND amount/currency must match.
 */
export function decideBachsGrant(
  checkout: BachsCheckout,
  payment: CrescivaPaymentLite | null | undefined,
): { action: GrantAction } {
  if (!payment) return { action: "ignore" };
  if (String(checkout.payment_status ?? "").toLowerCase() !== "succeeded") {
    return { action: "ignore" };
  }
  if (String(checkout.charge?.status ?? "").toLowerCase() !== "succeeded") {
    return { action: "ignore" };
  }
  if (!checkoutMatchesPayment(checkout, payment)) {
    return { action: "mismatch" };
  }
  if (payment.status === "success") return { action: "already" };
  return { action: "grant" };
}

export function checkoutMatchesPayment(
  checkout: BachsCheckout,
  payment: CrescivaPaymentLite,
): boolean {
  const currency = String(checkout.currency ?? "").toUpperCase();
  const paymentCurrency = String(payment.currency ?? "").toUpperCase();
  if (!currency || currency !== paymentCurrency) return false;

  const expectedAmount = Number(payment.amount);
  if (!Number.isSafeInteger(expectedAmount)) return false;
  const checkoutAmount = decimalToSubunits(String(checkout.amount ?? ""), currency);
  if (checkoutAmount == null || checkoutAmount !== expectedAmount) return false;

  if (checkout.charge) {
    const chargeCurrency = String(checkout.charge.currency ?? "").toUpperCase();
    const chargeAmount = decimalToSubunits(
      String(checkout.charge.amount ?? ""),
      chargeCurrency,
    );
    if (chargeCurrency !== paymentCurrency || chargeAmount !== expectedAmount) return false;
  }

  return true;
}

/**
 * Resolve the official Bachs API host and reject accidental cross-environment
 * configuration. A live key can never be sent to sandbox and vice versa.
 */
export function resolveBachsBaseUrl(
  secretKey: string,
  configuredBaseUrl?: string | null,
): string {
  const expected = secretKey.startsWith("sk_live_")
    ? BACHS_LIVE_BASE_URL
    : secretKey.startsWith("sk_sandbox_")
      ? BACHS_SANDBOX_BASE_URL
      : null;
  if (!expected) throw new Error("Unrecognized Bachs API key environment.");

  const configured = configuredBaseUrl?.replace(/\/+$/, "") || expected;
  if (configured !== BACHS_LIVE_BASE_URL && configured !== BACHS_SANDBOX_BASE_URL) {
    throw new Error("BACHS_BASE_URL must be an official Bachs API origin.");
  }
  if (configured !== expected) {
    throw new Error("Bachs API key environment does not match BACHS_BASE_URL.");
  }
  return configured;
}

/** Thin JSON wrapper over the Bachs API. Never logs or exposes the secret key. */
export async function bachsFetch<T = unknown>(
  path: string,
  secretKey: string,
  baseUrl: string,
  init: RequestInit = {},
): Promise<BachsResult<T>> {
  if (!path.startsWith("/v1/")) throw new Error("Bachs API path must start with /v1/.");
  const safeBaseUrl = resolveBachsBaseUrl(secretKey, baseUrl);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${secretKey}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${safeBaseUrl}${path}`, { ...init, headers });
  let json: unknown = {};
  try {
    json = await response.json();
  } catch {
    json = {};
  }
  return { ok: response.ok, status: response.status, json: json as T };
}

/** Store only a bounded payment summary, never a full provider/customer object. */
export function safeBachsCheckoutSummary(checkout: BachsCheckout): Record<string, unknown> {
  return {
    checkout_id: checkout.checkout_id,
    status: checkout.status ?? null,
    payment_status: checkout.payment_status ?? null,
    reference: checkout.reference ?? null,
    amount: checkout.amount ?? null,
    currency: checkout.currency ?? null,
    payment_method: checkout.payment_method ?? null,
    payment_id: checkout.charge?.payment_id ?? null,
    charge_status: checkout.charge?.status ?? null,
    completed_at: checkout.completed_at ?? null,
    expires_at: checkout.expires_at ?? null,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
