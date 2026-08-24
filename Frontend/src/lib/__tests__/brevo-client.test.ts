import { describe, expect, it, vi } from "vitest";
import { createBrevoClient } from "../../../../supabase/functions/_shared/brevo/client.ts";

const config = { apiKey: "xkeysib-top-secret", listId: 19, senderId: 7 };

describe("Brevo client", () => {
  it("redacts credentials from permanent provider errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ message: "invalid xkeysib-top-secret" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    const result = await createBrevoClient(config, { fetchImpl }).health();

    expect(result).toEqual({ ok: false, status: 401, retryable: false, error: "invalid xkeysib-***" });
    expect(JSON.stringify(result)).not.toContain(config.apiKey);
  });

  it("upserts a subscribed contact into the configured list with the local id", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 314 }), { status: 201 }));
    const client = createBrevoClient(config, { fetchImpl });

    const result = await client.upsertContact({
      email: "Founder@Example.com",
      subscriberId: "2da456d0-b90d-4d8e-b656-0ff9dd26c51b",
      subscribed: true,
    });

    expect(result).toEqual({ ok: true, data: { id: 314 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/contacts");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "founder@example.com",
      ext_id: "2da456d0-b90d-4d8e-b656-0ff9dd26c51b",
      listIds: [19],
      emailBlacklisted: false,
      updateEnabled: true,
      getId: true,
    });
  });

  it("retries a rate limit once and returns the successful response", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"message":"slow down"}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{"plan":[{"type":"free"}]}', { status: 200 }));
    const sleepImpl = vi.fn(async () => undefined);

    const result = await createBrevoClient(config, { fetchImpl, sleepImpl, maxAttempts: 2 }).health();

    expect(result).toEqual({ ok: true, data: { plan: [{ type: "free" }] } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it("creates a campaign using only configured sender/list ids", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('{"id":55}', { status: 201 }));

    const result = await createBrevoClient(config, { fetchImpl }).createCampaign({
      name: "August dispatch",
      subject: "Fresh funding",
      previewText: "This week's opportunities",
      htmlContent: "<html><body>Useful funding</body></html>",
      replyTo: "team@example.com",
      senderName: "Cresciva",
    });

    expect(result).toEqual({ ok: true, data: { id: 55 } });
    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      name: "August dispatch",
      sender: { id: 7, name: "Cresciva" },
      recipients: { listIds: [19] },
      subject: "Fresh funding",
      replyTo: "team@example.com",
    });
  });

  it("updates a draft campaign before sending a new test revision", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));

    const result = await createBrevoClient(config, { fetchImpl }).updateCampaign(55, {
      name: "August dispatch v2",
      subject: "More funding",
      previewText: "Updated opportunities",
      htmlContent: "<html><body>Updated funding</body></html>",
      replyTo: "team@example.com",
      senderName: "Cresciva",
    });

    expect(result).toEqual({ ok: true, data: null });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/emailCampaigns/55");
    expect(init?.method).toBe("PUT");
  });

  it("creates a campaign-specific list for a snapshotted segment", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"id":19,"folderId":3}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"id":88}', { status: 201 }))
      .mockResolvedValueOnce(new Response('{"success":["one@example.com","two@example.com"],"failure":[]}', { status: 201 }));

    const result = await createBrevoClient(config, { fetchImpl }).createAudienceList(
      "Cresciva · August dispatch · 12345678",
      ["one@example.com", "two@example.com"],
    );

    expect(result).toEqual({ ok: true, data: { id: 88 } });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({
      name: "Cresciva · August dispatch · 12345678",
      folderId: 3,
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[2][1]?.body))).toEqual({
      emails: ["one@example.com", "two@example.com"],
    });
  });
});
