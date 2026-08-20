import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  classifyWebhookInsertError,
  decimalToSubunits,
  decideBachsGrant,
  subunitsToDecimal,
  verifyBachsSignature,
  type BachsCheckout,
} from "../../../../supabase/functions/_shared/bachs";

const SECRET = "whsec_test_cresciva";
const EVENT = JSON.stringify({
  id: "evt_cresciva_1",
  type: "collection.succeeded",
  created_at: "2026-08-20T13:30:00Z",
  organization_id: "acct_cresciva",
  data: { checkout_id: "chk_cresciva_1", amount: "200.00", currency: "USD" },
});
const TIMESTAMP = "1787232600";

function nodeSignature(rawBody: string, timestamp: string, secret = SECRET) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

describe("Bachs amount boundary", () => {
  it("converts Cresciva integer subunits to Bachs decimal strings without float math", () => {
    expect(subunitsToDecimal(9_500_000, "NGN")).toBe("95000.00");
    expect(subunitsToDecimal(20_000, "USD")).toBe("200.00");
  });

  it("converts Bachs decimal strings back to exact integer subunits", () => {
    expect(decimalToSubunits("95000.00", "NGN")).toBe(9_500_000);
    expect(decimalToSubunits("200.00", "USD")).toBe(20_000);
    expect(decimalToSubunits("200", "USD")).toBe(20_000);
    expect(decimalToSubunits("2.999", "USD")).toBeNull();
    expect(decimalToSubunits("NaN", "USD")).toBeNull();
  });
});

describe("Bachs webhook signatures", () => {
  it("accepts the documented HMAC-SHA256 timestamp.raw_body signature", async () => {
    const signature = nodeSignature(EVENT, TIMESTAMP);
    await expect(
      verifyBachsSignature(EVENT, TIMESTAMP, signature, SECRET, Number(TIMESTAMP) + 10),
    ).resolves.toBe(true);
  });

  it("rejects stale deliveries outside the 300-second tolerance", async () => {
    const signature = nodeSignature(EVENT, TIMESTAMP);
    await expect(
      verifyBachsSignature(EVENT, TIMESTAMP, signature, SECRET, Number(TIMESTAMP) + 301),
    ).resolves.toBe(false);
  });

  it("rejects a tampered raw body", async () => {
    const signature = nodeSignature(EVENT, TIMESTAMP);
    await expect(
      verifyBachsSignature(`${EVENT} `, TIMESTAMP, signature, SECRET, Number(TIMESTAMP) + 10),
    ).resolves.toBe(false);
  });

  it("rejects missing, malformed, or wrong-key signatures", async () => {
    await expect(
      verifyBachsSignature(EVENT, TIMESTAMP, null, SECRET, Number(TIMESTAMP) + 10),
    ).resolves.toBe(false);
    await expect(
      verifyBachsSignature(EVENT, "not-a-timestamp", "abcd", SECRET, Number(TIMESTAMP)),
    ).resolves.toBe(false);
    await expect(
      verifyBachsSignature(
        EVENT,
        TIMESTAMP,
        nodeSignature(EVENT, TIMESTAMP, "wrong-secret"),
        SECRET,
        Number(TIMESTAMP),
      ),
    ).resolves.toBe(false);
  });
});

describe("webhook event persistence classification", () => {
  it("acknowledges only a PostgreSQL unique violation as duplicate", () => {
    expect(classifyWebhookInsertError({ code: "23505" })).toBe("duplicate");
    expect(classifyWebhookInsertError({ code: "08006" })).toBe("retry");
    expect(classifyWebhookInsertError({ code: "42501" })).toBe("retry");
    expect(classifyWebhookInsertError(null)).toBe("none");
  });
});

describe("Bachs settlement decision", () => {
  const checkout: BachsCheckout = {
    checkout_id: "chk_cresciva_1",
    status: "completed",
    payment_status: "succeeded",
    amount: "200.00",
    currency: "USD",
    reference: "crv_payment_1",
    charge: {
      payment_id: "pay_cresciva_1",
      status: "succeeded",
      amount: "200.00",
      currency: "USD",
    },
  };

  const payment = { amount: 20_000, currency: "USD", status: "initialized" };

  it("grants only when checkout and internal ledger agree", () => {
    expect(decideBachsGrant(checkout, payment)).toEqual({ action: "grant" });
  });

  it("rejects amount or currency mismatch", () => {
    expect(decideBachsGrant({ ...checkout, amount: "199.00" }, payment)).toEqual({
      action: "mismatch",
    });
    expect(decideBachsGrant({ ...checkout, currency: "NGN" }, payment)).toEqual({
      action: "mismatch",
    });
  });

  it("is idempotent once the Cresciva payment is already successful", () => {
    expect(decideBachsGrant(checkout, { ...payment, status: "success" })).toEqual({
      action: "already",
    });
  });

  it("does not grant from a completed checkout without a successful collection", () => {
    expect(
      decideBachsGrant({ ...checkout, payment_status: "processing" }, payment),
    ).toEqual({ action: "ignore" });
  });
});
