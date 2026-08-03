import { describe, it, expect, vi } from "vitest";
import {
  redact,
  RESEND_ENDPOINT,
  sendEmail,
} from "../../../../supabase/functions/_shared/email/resend";

// Fake, structurally-valid key. Never put a real one in a tracked file.
const KEY = "re_TESTONLY_0000000000000000000000";

const BASE = {
  from: "Cresciva <hello@cresciva.com>",
  to: "founder@example.com",
  subject: "Hi",
  html: "<p>Hi</p>",
  text: "Hi",
};

/** Build a fetch stub that returns the queued responses in order. */
function stubFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const noSleep = () => Promise.resolve();

describe("sendEmail", () => {
  it("posts to the Resend endpoint and returns the message id", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "msg_1" } }]);
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });

    expect(result).toEqual({ ok: true, id: "msg_1" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(RESEND_ENDPOINT);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual(["founder@example.com"]);
    expect(body.text).toBe("Hi");
  });

  it("sends the Idempotency-Key header when one is supplied", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "msg_2" } }]);
    await sendEmail(KEY, { ...BASE, idempotencyKey: "receipt:pay-1" }, {
      fetchImpl: impl,
      sleepImpl: noSleep,
    });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("receipt:pay-1");
  });

  it("omits the Idempotency-Key header when none is supplied", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "msg_3" } }]);
    await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeUndefined();
  });

  it("retries a 429 and succeeds on the second attempt", async () => {
    const { impl, calls } = stubFetch([
      { status: 429, body: { message: "rate limited" } },
      { status: 200, body: { id: "msg_4" } },
    ]);
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(result).toEqual({ ok: true, id: "msg_4" });
    expect(calls).toHaveLength(2);
  });

  it("retries 5xx up to maxAttempts, then reports the failure", async () => {
    const { impl, calls } = stubFetch([
      { status: 503, body: { message: "unavailable" } },
      { status: 503, body: { message: "unavailable" } },
      { status: 503, body: { message: "unavailable" } },
    ]);
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(calls).toHaveLength(3);
    expect(result).toMatchObject({ ok: false, status: 503, retryable: true });
  });

  it("does NOT retry a 422 — a bad payload only burns quota on retry", async () => {
    const { impl, calls } = stubFetch([
      { status: 422, body: { message: "Invalid `to` field" } },
      { status: 200, body: { id: "never-reached" } },
    ]);
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(calls).toHaveLength(1);
    expect(result).toMatchObject({ ok: false, status: 422, retryable: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Invalid");
  });

  it("retries a thrown network error", async () => {
    let attempt = 0;
    const impl = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error("network down");
      return new Response(JSON.stringify({ id: "msg_5" }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(result).toEqual({ ok: true, id: "msg_5" });
    expect(attempt).toBe(2);
  });

  it("fails closed with no API key and never calls fetch", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "x" } }]);
    const result = await sendEmail("", BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(calls).toHaveLength(0);
    expect(result).toMatchObject({ ok: false, retryable: false });
  });

  it("sanitises tag names and values to the allowed charset", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "msg_6" } }]);
    await sendEmail(KEY, { ...BASE, tags: { "kind!": "contact ack" } }, {
      fetchImpl: impl,
      sleepImpl: noSleep,
    });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.tags).toEqual([{ name: "kind_", value: "contact_ack" }]);
  });

  it("passes List-Unsubscribe headers straight through", async () => {
    const { impl, calls } = stubFetch([{ status: 200, body: { id: "msg_7" } }]);
    await sendEmail(
      KEY,
      { ...BASE, headers: { "List-Unsubscribe": "<https://x.test/u?t=1>" } },
      { fetchImpl: impl, sleepImpl: noSleep },
    );
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.headers["List-Unsubscribe"]).toBe("<https://x.test/u?t=1>");
  });

  it("treats a 200 without an id as a failure rather than a phantom success", async () => {
    const { impl } = stubFetch([
      { status: 200, body: {} },
      { status: 200, body: {} },
      { status: 200, body: {} },
    ]);
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(result.ok).toBe(false);
  });
});

describe("redact", () => {
  it("masks anything shaped like a Resend key", () => {
    expect(redact("bad key re_TESTONLY_1111111111111111111111 rejected")).toBe(
      "bad key re_*** rejected",
    );
  });

  it("leaves ordinary text alone", () => {
    expect(redact("Invalid `to` field")).toBe("Invalid `to` field");
  });

  it("never leaks the key through an error message", async () => {
    const impl = vi.fn(async () =>
      // A provider echoing the auth header back into the error body.
      new Response(JSON.stringify({ message: `Bad key: ${KEY}` }), { status: 401 }),
    ) as unknown as typeof fetch;
    const result = await sendEmail(KEY, BASE, { fetchImpl: impl, sleepImpl: noSleep });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain(KEY);
      expect(result.error).toContain("re_***");
    }
  });
});
