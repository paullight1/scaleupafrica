import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPaymentReceipt } from "../../../../supabase/functions/_shared/email/receipt";

describe("payment receipt delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends from the verified domain and links the audit event to its payment", async () => {
    const auditRows: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const records: Record<string, Record<string, unknown>> = {
      payments: {
        id: "pay_internal_1",
        amount: 2_500,
        currency: "USD",
        reference: "crv_1",
        user_id: "user_1",
        paid_at: "2026-08-20T17:00:00Z",
      },
      subscriptions: { expires_at: "2026-11-20T17:00:00Z" },
    };
    const admin = {
      from(table: string) {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: records[table] ?? null }),
                };
              },
            };
          },
          insert: async (row: Record<string, unknown>) => {
            auditRows.push(row);
            return { error: null };
          },
        };
      },
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                email: "founder@example.com",
                user_metadata: { full_name: "Ada Founder" },
              },
            },
          }),
        },
      },
    };

    await sendPaymentReceipt(admin, "pay_internal_1", {
      RESEND_API_KEY: "re_test_key",
      SITE_URL: "https://www.crescivacapital.com",
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.from).toBe("Cresciva <receipts@update.crescivacapital.com>");
    expect(auditRows).toEqual([
      expect.objectContaining({
        kind: "payment_receipt",
        status: "sent",
        provider_id: "email_123",
        payment_id: "pay_internal_1",
      }),
    ]);
  });
});
