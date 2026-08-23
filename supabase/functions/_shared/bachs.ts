// =============================================================================
// Bachs payment helpers — pure TypeScript using Web Crypto + fetch only.
//
// Cresciva stores money internally as integer subunits (kobo/cents). Bachs API
// money is represented as decimal strings at the currency's precision. Conversion
// is isolated here so accounting code never switches to floating point.
// =============================================================================

export const BACHS_SANDBOX_BASE_URL = "https://sandbox-api.bachs.io";
export const BACHS_LIVE_BASE_URL = "https://api.bachs.io";
export const BACHS_WEBHOOK_TOLERANCE_SECONDS = 300;

const CURRENCY_DECIMALS = {
  NGN: 2,
  USD: 2,
} as const;

export type BachsSupportedCurrency = keyof typeof CURRENCY_DECIMALS;
export type BachsProductMap = Partial<Record<BachsSupportedCurrency, string>>;
export type BachsPlanCode = "monthly" | "quarterly" | "annual";
export type BachsPlanProductMap = Partial<
  Record<BachsPlanCode, Partial<Record<BachsSupportedCurrency, string>>>
>;

export type BachsSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "paused";

export interface BachsSubscriptionSnapshot {
  subscription_id: string;
  customer_id: string | null;
  product_id: string | null;
  status: BachsSubscriptionStatus;
  collection_method: string | null;
  currency: string | null;
  amount: string | null;
  billing_cycle: { interval: string; frequency: number } | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billed_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  metadata: Record<string, unknown>;
}

export interface BachsInvoiceSnapshot {
  invoice_id: string;
  subscription_id: string | null;
  customer_id: string | null;
  status: string;
  currency: string | null;
  total: string | null;
  amount_paid: string | null;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown>;
}

export interface BachsResult<T = unknown> {
  ok: boolean;
  status: number;
  json: T;
}

export interface BachsCheckout {
  checkout_id: string;
  checkout_url?: string | null;
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

const BACHS_SUBSCRIPTION_STATUSES = new Set<BachsSubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "paused",
]);

export function parseBachsSubscriptionSnapshot(value: unknown): BachsSubscriptionSnapshot | null {
  if (!isRecord(value)) return null;
  const subscriptionId = stringValue(value.subscription_id);
  const status = stringValue(value.status) as BachsSubscriptionStatus;
  if (!/^sub_[A-Za-z0-9_-]{4,120}$/.test(subscriptionId) || !BACHS_SUBSCRIPTION_STATUSES.has(status)) {
    return null;
  }

  const customer = isRecord(value.customer) ? value.customer : null;
  const billingCycle = isRecord(value.billing_cycle) ? value.billing_cycle : null;
  const frequency = billingCycle ? Number(billingCycle.frequency) : NaN;

  return {
    subscription_id: subscriptionId,
    customer_id: customer ? stringOrNull(customer.customer_id ?? customer.id) : null,
    product_id: stringOrNull(value.product_id),
    status,
    collection_method: stringOrNull(value.collection_method),
    currency: stringOrNull(value.currency)?.toUpperCase() ?? null,
    amount: stringOrNull(value.amount),
    billing_cycle:
      billingCycle && typeof billingCycle.interval === "string" && Number.isSafeInteger(frequency) && frequency > 0
        ? { interval: billingCycle.interval, frequency }
        : null,
    current_period_start: stringOrNull(value.current_period_start),
    current_period_end: stringOrNull(value.current_period_end),
    next_billed_at: stringOrNull(value.next_billed_at),
    cancel_at_period_end: value.cancel_at_period_end === true,
    canceled_at: stringOrNull(value.canceled_at),
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
}

export function parseBachsInvoiceSnapshot(value: unknown): BachsInvoiceSnapshot | null {
  if (!isRecord(value)) return null;
  const invoiceId = stringValue(value.invoice_id);
  if (!/^inv_[A-Za-z0-9_-]{4,120}$/.test(invoiceId)) return null;
  const subscription = isRecord(value.subscription) ? value.subscription : null;
  const customer = isRecord(value.customer) ? value.customer : null;

  return {
    invoice_id: invoiceId,
    subscription_id: subscription ? stringOrNull(subscription.subscription_id ?? subscription.id) : null,
    customer_id: customer ? stringOrNull(customer.customer_id ?? customer.id) : null,
    status: stringValue(value.status),
    currency: stringOrNull(value.currency)?.toUpperCase() ?? null,
    total: stringOrNull(value.total),
    amount_paid: stringOrNull(value.amount_paid),
    period_start: stringOrNull(value.period_start),
    period_end: stringOrNull(value.period_end),
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
}

export function invoiceMatchesExpected(
  invoice: BachsInvoiceSnapshot,
  expectedAmount: number,
  expectedCurrency: string,
): boolean {
  if (invoice.status.toLowerCase() !== "paid") return false;
  const currency = String(expectedCurrency).toUpperCase();
  if (invoice.currency !== currency) return false;
  const total = invoice.total ? decimalToSubunits(invoice.total, currency) : null;
  const paid = invoice.amount_paid ? decimalToSubunits(invoice.amount_paid, currency) : null;
  return total === expectedAmount && paid === expectedAmount;
}

export function isSubscriptionAccessValid(
  status: BachsSubscriptionStatus | string,
  currentPeriodEnd: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!["trialing", "active", "past_due", "unpaid"].includes(String(status).toLowerCase())) return false;
  const periodEndMs = currentPeriodEnd ? Date.parse(currentPeriodEnd) : NaN;
  return Number.isFinite(periodEndMs) && periodEndMs > nowMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringOrNull(value: unknown): string | null {
  const normalized = stringValue(value);
  return normalized || null;
}

export type GrantAction = "grant" | "already" | "mismatch" | "ignore";
export type WebhookInsertOutcome = "duplicate" | "retry" | "none";

/** Select the configured one-time Bachs product for the charge currency. */
export function resolveBachsProductId(currency: string, products: BachsProductMap): string | null {
  const normalized = currency.toUpperCase() as BachsSupportedCurrency;
  if (!(normalized in CURRENCY_DECIMALS)) return null;
  const productId = products[normalized]?.trim() ?? "";
  return /^prod_[A-Za-z0-9_-]{3,120}$/.test(productId) ? productId : null;
}

/** Select a configured one-time Bachs product for a specific plan and currency. */
export function resolveBachsPlanProductId(
  plan: string,
  currency: string,
  products: BachsPlanProductMap,
): string | null {
  if (plan !== "monthly" && plan !== "quarterly" && plan !== "annual") return null;
  const normalized = currency.toUpperCase() as BachsSupportedCurrency;
  if (!(normalized in CURRENCY_DECIMALS)) return null;
  const productId = products[plan]?.[normalized]?.trim() ?? "";
  return /^prod_[A-Za-z0-9_-]{3,120}$/.test(productId) ? productId : null;
}

/**
 * Current product-based checkouts carry the Cresciva payment reference in
 * metadata. `reference` remains a backwards-compatible fallback for provider
 * objects created by the earlier integration shape.
 */
export function crescivaReferenceFromCheckout(checkout: BachsCheckout): string | null {
  const metadataReference = checkout.metadata?.cresciva_reference;
  if (
    typeof metadataReference === "string" &&
    /^crv_[A-Za-z0-9-]{8,120}$/.test(metadataReference.trim())
  ) {
    return metadataReference.trim();
  }

  const legacyReference = checkout.reference?.trim() ?? "";
  return /^crv_[A-Za-z0-9-]{8,120}$/.test(legacyReference) ? legacyReference : null;
}

/** Convert integer subunits to an exact decimal string without float division. */
export function subunitsToDecimal(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative safe integer in subunits.");
  }
  const factor = 10 ** decimals;
  const whole = Math.floor(amount / factor);
  const fraction = String(amount % factor).padStart(decimals, "0");
  return `${whole}.${fraction}`;
}

/** Convert a Bachs decimal-string amount back to Cresciva integer subunits. */
export function decimalToSubunits(value: string, currency: string): number | null {
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
export async function computeHmacSha256Hex(message: string, secret: string): Promise<string> {
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
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/**
 * Verify Bachs X-Bachs-Timestamp + X-Bachs-Signature. Bachs signs
 * `${timestamp}.${raw_body}` with HMAC-SHA256; stale deliveries are rejected.
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
  const expected = await computeHmacSha256Hex(`${timestampHeader.trim()}.${rawBody}`, secret);
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

/** Bachs uses ACCEPTED as an alternative terminal success state on some rails. */
export function isBachsTerminalSuccess(status: unknown): boolean {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "succeeded" || normalized === "accepted";
}

/**
 * Decide whether a retrieved Bachs checkout can grant the stored Cresciva
 * payment. Settled provider state plus exact amount/currency agreement are both
 * required; an already-successful internal row is an idempotent no-op.
 */
export function decideBachsGrant(
  checkout: BachsCheckout,
  payment: CrescivaPaymentLite | null | undefined,
): { action: GrantAction } {
  if (!payment) return { action: "ignore" };
  if (String(checkout.payment_status ?? "").toLowerCase() !== "succeeded") {
    return { action: "ignore" };
  }
  if (!isBachsTerminalSuccess(checkout.charge?.status)) return { action: "ignore" };
  if (!checkoutMatchesPayment(checkout, payment)) return { action: "mismatch" };
  if (payment.status === "success") return { action: "already" };
  return { action: "grant" };
}

export function checkoutMatchesPayment(
  checkout: BachsCheckout,
  payment: CrescivaPaymentLite,
): boolean {
  const paymentCurrency = String(payment.currency ?? "").toUpperCase();
  const currency = String(checkout.currency ?? checkout.charge?.currency ?? "").toUpperCase();
  if (!currency || currency !== paymentCurrency) return false;

  const expectedAmount = Number(payment.amount);
  if (!Number.isSafeInteger(expectedAmount)) return false;

  const checkoutAmountValue = checkout.amount ?? checkout.charge?.amount ?? "";
  const checkoutAmount = decimalToSubunits(String(checkoutAmountValue), currency);
  if (checkoutAmount == null || checkoutAmount !== expectedAmount) return false;

  if (checkout.charge) {
    const chargeCurrency = String(checkout.charge.currency ?? currency).toUpperCase();
    const chargeAmount = decimalToSubunits(
      String(checkout.charge.amount ?? checkoutAmountValue),
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
    reference: crescivaReferenceFromCheckout(checkout),
    amount: checkout.amount ?? checkout.charge?.amount ?? null,
    currency: checkout.currency ?? checkout.charge?.currency ?? null,
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
