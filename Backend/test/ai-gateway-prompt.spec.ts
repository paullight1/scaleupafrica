import { describe, expect, it } from "vitest";
import { fundingDiscoveryPrompt } from "../src/funding/ai-gateway.service";

describe("funding AI discovery prompt", () => {
  it("allows zero results and caps discovery instead of forcing padding", () => {
    const prompt = `${fundingDiscoveryPrompt.system}\n${fundingDiscoveryPrompt.user("climate Nigeria")}`;
    expect(prompt).toMatch(/0-10/i);
    expect(prompt).toMatch(/zero/i);
    expect(prompt).not.toMatch(/at least 15/i);
    expect(prompt).not.toMatch(/15-25/i);
    expect(prompt).not.toMatch(/3-5 fellowship/i);
  });

  it("forbids historical deadline substitution and verified claims", () => {
    const prompt = `${fundingDiscoveryPrompt.system}\n${fundingDiscoveryPrompt.user("agritech")}`;
    expect(prompt).toMatch(/current.*deadline/i);
    expect(prompt).toMatch(/empty string/i);
    expect(prompt).toMatch(/historical/i);
    expect(prompt).toMatch(/never claim.*verified/i);
    expect(prompt).not.toMatch(/typical closing month/i);
  });
});
