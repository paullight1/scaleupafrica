import { describe, expect, it } from "vitest";
import { loadEmailConfig } from "../../../../supabase/functions/_shared/email/config";

describe("email public origin fallback", () => {
  it("defaults transactional links to the canonical Cresciva readiness origin", () => {
    expect(loadEmailConfig({}).siteUrl).toBe("https://cresciva.vercel.app");
  });

  it("uses an explicit SITE_URL and removes trailing slashes", () => {
    expect(loadEmailConfig({ SITE_URL: "https://app.example.com///" }).siteUrl).toBe("https://app.example.com");
  });
});
