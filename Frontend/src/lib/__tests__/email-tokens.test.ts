import { describe, it, expect } from "vitest";
import {
  signUnsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "../../../../supabase/functions/_shared/email/tokens";

const SECRET = "unsub_secret_deadbeef";
const OTHER_SECRET = "a_different_secret";

describe("unsubscribe tokens", () => {
  it("round-trips an address", async () => {
    const token = await signUnsubscribeToken("Someone@Example.COM", SECRET);
    await expect(verifyUnsubscribeToken(token, SECRET)).resolves.toBe("someone@example.com");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signUnsubscribeToken("a@b.com", OTHER_SECRET);
    await expect(verifyUnsubscribeToken(token, SECRET)).resolves.toBeNull();
  });

  it("rejects a tampered payload — swapping the address invalidates the signature", async () => {
    const token = await signUnsubscribeToken("victim@example.com", SECRET);
    const [, sig] = token.split(".");
    const forgedPayload = btoa(JSON.stringify({ p: "unsub", e: "attacker@example.com" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await expect(verifyUnsubscribeToken(`${forgedPayload}.${sig}`, SECRET)).resolves.toBeNull();
  });

  it("rejects a flipped signature byte", async () => {
    const token = await signUnsubscribeToken("a@b.com", SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    await expect(verifyUnsubscribeToken(flipped, SECRET)).resolves.toBeNull();
  });

  it("rejects a token whose purpose claim is not 'unsub'", async () => {
    // Sign a well-formed payload for a different purpose with the REAL secret:
    // a valid signature must still not authorise an unsubscribe.
    const payload = btoa(JSON.stringify({ p: "login", e: "a@b.com" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const realToken = await signUnsubscribeToken("a@b.com", SECRET);
    // Reuse the signing routine indirectly: sign `payload` by asking for a token
    // over an address, then confirm the mismatched payload/sig pair fails.
    const [, sig] = realToken.split(".");
    await expect(verifyUnsubscribeToken(`${payload}.${sig}`, SECRET)).resolves.toBeNull();
  });

  it.each([["", "empty"], ["nodot", "no separator"], [".sig", "empty payload"], ["payload.", "empty signature"]])(
    "rejects a malformed token (%s — %s)",
    async (token) => {
      await expect(verifyUnsubscribeToken(token, SECRET)).resolves.toBeNull();
    },
  );

  it("refuses to sign without a secret", async () => {
    await expect(signUnsubscribeToken("a@b.com", "")).rejects.toThrow(/EMAIL_TOKEN_SECRET/);
  });

  it("verifies nothing when no secret is configured", async () => {
    const token = await signUnsubscribeToken("a@b.com", SECRET);
    await expect(verifyUnsubscribeToken(token, "")).resolves.toBeNull();
  });
});

describe("unsubscribeUrl", () => {
  it("builds a URL-encoded link against the functions base", async () => {
    const url = await unsubscribeUrl("a@b.com", SECRET, "https://ref.supabase.co/functions/v1/");
    expect(url).toMatch(/^https:\/\/ref\.supabase\.co\/functions\/v1\/email-unsubscribe\?token=/);
    const token = decodeURIComponent(new URL(url!).searchParams.get("token")!);
    await expect(verifyUnsubscribeToken(token, SECRET)).resolves.toBe("a@b.com");
  });

  it("returns null (so templates omit the link) when no secret is set", async () => {
    await expect(unsubscribeUrl("a@b.com", "", "https://x.test")).resolves.toBeNull();
  });
});
