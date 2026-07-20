import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/authErrors";

describe("mapAuthError", () => {
  it("maps invalid_credentials", () => {
    expect(mapAuthError({ code: "invalid_credentials" }).message).toBe(
      "Email or password is incorrect. Check both and try again — or reset your password below."
    );
  });

  it("maps email_not_confirmed", () => {
    expect(mapAuthError({ code: "email_not_confirmed" }).message).toBe(
      "Your email isn't confirmed yet. Check your inbox (and spam) for our confirmation link."
    );
  });

  it("maps user_already_exists", () => {
    expect(mapAuthError({ code: "user_already_exists" }).message).toBe(
      "An account with this email already exists. Sign in instead — or reset your password if you've forgotten it."
    );
  });

  it("maps weak_password", () => {
    expect(mapAuthError({ code: "weak_password" }).message).toBe(
      "Please choose a longer password (at least 6 characters)."
    );
  });

  it("maps rate-limit codes", () => {
    expect(mapAuthError({ code: "over_email_send_rate_limit" }).message).toBe(
      "Too many attempts. Wait a minute, then try again."
    );
    expect(mapAuthError({ code: "over_request_rate_limit" }).message).toBe(
      "Too many attempts. Wait a minute, then try again."
    );
  });

  it("maps same_password (reset)", () => {
    expect(mapAuthError({ code: "same_password" }).message).toBe(
      "New password must be different from your current one."
    );
  });

  it("maps a network TypeError", () => {
    expect(mapAuthError(new TypeError("Failed to fetch")).message).toBe(
      "Can't reach the server. Check your connection and try again."
    );
  });

  it("falls back to a message substring when no code is present", () => {
    expect(
      mapAuthError({ message: "Invalid login credentials" }).message
    ).toBe(
      "Email or password is incorrect. Check both and try again — or reset your password below."
    );
  });

  it("returns a generic message for unknown errors and never leaks the raw message", () => {
    const raw = "PGRST500: some raw supabase internal detail";
    const result = mapAuthError({ message: raw });
    expect(result.message).toBe("Something went wrong on our side. Please try again.");
    expect(result.message).not.toContain(raw);
  });
});
