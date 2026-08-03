import { describe, it, expect } from "vitest";
import { scorePassword, MIN_PASSWORD_LENGTH } from "@shared/lib/passwordStrength";

describe("scorePassword", () => {
  it("says nothing about an empty password", () => {
    expect(scorePassword("")).toEqual({ score: 0, label: "", hint: null });
  });

  it("rejects anything under the minimum length", () => {
    const result = scorePassword("abc123!");
    expect(result.score).toBe(0);
    expect(result.hint).toContain(`${MIN_PASSWORD_LENGTH} characters`);
  });

  it("floors the most-guessed passwords regardless of length", () => {
    const result = scorePassword("password123");
    expect(result.score).toBe(0);
    expect(result.hint).toMatch(/most-guessed/);
  });

  it("penalises a password built from the email address", () => {
    const result = scorePassword("amara2024xyz", { email: "amara@kaya.africa" });
    expect(result.score).toBe(1);
    expect(result.hint).toMatch(/email address/);
  });

  it("only applies the email penalty to a local part worth matching", () => {
    // A two-character local part would match far too much by chance.
    const result = scorePassword("abunchofwords", { email: "ab@kaya.africa" });
    expect(result.hint).not.toMatch(/email address/);
  });

  it("rejects a single repeated character", () => {
    expect(scorePassword("aaaaaaaaaa").score).toBe(0);
  });

  it("rewards length over complexity", () => {
    const longPassphrase = scorePassword("correct horse battery staple");
    const shortComplex = scorePassword("Xy7!qZ2p");
    expect(longPassphrase.score).toBe(4);
    expect(longPassphrase.score).toBeGreaterThan(shortComplex.score);
  });

  it("gives a strong password no further advice", () => {
    expect(scorePassword("correct horse battery staple").hint).toBeNull();
  });

  it("scores a mid-length mixed password as usable but improvable", () => {
    const result = scorePassword("kayalog1");
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.score).toBeLessThan(4);
    expect(result.hint).not.toBeNull();
  });
});
