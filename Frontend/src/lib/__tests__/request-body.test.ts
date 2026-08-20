import { describe, expect, it } from "vitest";
import { readBoundedText } from "../../../../supabase/functions/_shared/requestBody";

describe("readBoundedText", () => {
  const makeRequest = (body: string, headers?: HeadersInit) =>
    new Request("https://example.test/webhook", { method: "POST", body, headers });

  it("accepts bodies below the limit", async () => {
    await expect(readBoundedText(makeRequest("hello"), 16)).resolves.toEqual({
      ok: true,
      body: "hello",
      bytes: 5,
    });
  });

  it("accepts a body exactly at the limit", async () => {
    const body = "x".repeat(16);
    await expect(readBoundedText(makeRequest(body), 16)).resolves.toEqual({
      ok: true,
      body,
      bytes: 16,
    });
  });

  it("rejects a streamed body that exceeds the limit", async () => {
    await expect(readBoundedText(makeRequest("x".repeat(17)), 16)).resolves.toEqual({
      ok: false,
      status: 413,
    });
  });

  it("rejects immediately when content-length exceeds the limit", async () => {
    const request = makeRequest("small", { "content-length": "1000" });
    await expect(readBoundedText(request, 16)).resolves.toEqual({ ok: false, status: 413 });
  });
});
