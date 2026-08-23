/**
 * Maps raw Supabase auth errors to plain-language, brand-voice copy.
 * Never leak a raw Supabase message to the UI (IMPROVEMENTS §2.5).
 * Match on `AuthError.code` first (supabase-js v2), fall back to message
 * substring, then to a generic fallback. See docs/plans/02-auth-flow.md §4.2.
 */

import { MIN_PASSWORD_LENGTH } from "@shared/lib/passwordStrength";

export type FriendlyError = { title: string; message: string };

const GENERIC: FriendlyError = {
  title: "Something went wrong",
  message: "Something went wrong on our side. Please try again.",
};

const BY_CODE: Record<string, FriendlyError> = {
  auth_request_timeout: {
    title: "Authentication unavailable",
    message: "The authentication service is taking too long to respond. Please try again shortly.",
  },
  invalid_credentials: {
    title: "Check your details",
    message:
      "Email or password is incorrect. Check both and try again — or reset your password below.",
  },
  email_not_confirmed: {
    title: "Confirm your email",
    message:
      "Your email isn't confirmed yet. Check your inbox (and spam) for our confirmation link.",
  },
  user_already_exists: {
    title: "Account already exists",
    message:
      "An account with this email already exists. Sign in instead — or reset your password if you've forgotten it.",
  },
  weak_password: {
    title: "Choose a stronger password",
    message: `Please choose a longer password (at least ${MIN_PASSWORD_LENGTH} characters).`,
  },
  over_email_send_rate_limit: {
    title: "Too many attempts",
    message: "Too many attempts. Wait a minute, then try again.",
  },
  over_request_rate_limit: {
    title: "Too many attempts",
    message: "Too many attempts. Wait a minute, then try again.",
  },
  same_password: {
    title: "Choose a new password",
    message: "New password must be different from your current one.",
  },

  // ---- Provider / callback failures (OAuth, magic link) ----
  // These arrive as `error_code` on the callback URL rather than as a thrown
  // AuthError, so they never reach the message-substring fallbacks below.
  access_denied: {
    title: "Sign-in cancelled",
    message: "You cancelled the sign-in, or your provider declined it. Try again when you're ready.",
  },
  otp_expired: {
    title: "Link expired",
    message: "That sign-in link has expired or was already used. Request a fresh one below.",
  },
  flow_state_expired: {
    title: "Sign-in timed out",
    message: "That sign-in took too long to finish. Start again from this page.",
  },
  bad_oauth_state: {
    title: "Sign-in couldn't be verified",
    message:
      "We couldn't verify that sign-in — it may have been started in another tab. Try again from here.",
  },
  provider_email_needs_verification: {
    title: "Verify your email first",
    message:
      "Your provider hasn't verified this email address. Verify it with them, then sign in again.",
  },
  // Raised when a provider is enabled but has no client ID/secret configured,
  // or is switched off entirely. Nothing the visitor can fix.
  validation_failed: {
    title: "That sign-in method is unavailable",
    message: "This sign-in method isn't available right now. Use your email and password instead.",
  },
  provider_disabled: {
    title: "That sign-in method is unavailable",
    message: "This sign-in method isn't available right now. Use your email and password instead.",
  },
  signup_disabled: {
    title: "Sign-ups are closed",
    message: "New accounts aren't being created right now. Please check back later.",
  },
  server_error: {
    title: "Sign-in failed",
    message: "Your provider couldn't complete the sign-in. Try again, or use your email and password.",
  },
};

const PROVIDER_UNAVAILABLE: FriendlyError = BY_CODE.validation_failed;

const NETWORK: FriendlyError = {
  title: "Connection problem",
  message: "Can't reach the server. Check your connection and try again.",
};

function readString(obj: unknown, key: string): string | undefined {
  if (obj && typeof obj === "object" && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export function mapAuthError(err: unknown): FriendlyError {
  const code = readString(err, "code");
  if (code && BY_CODE[code]) return BY_CODE[code];

  const rawMessage =
    readString(err, "message") ?? (typeof err === "string" ? err : "");
  const message = rawMessage.toLowerCase();

  // Network / offline (supabase-js surfaces a TypeError "Failed to fetch").
  if (
    err instanceof TypeError ||
    /failed to fetch|networkerror|network request failed/.test(message)
  ) {
    return NETWORK;
  }

  // Message-substring fallbacks (older/edge cases without a stable code).
  // Provider misconfiguration: GoTrue answers /authorize with
  // "Unsupported provider: missing OAuth secret" when the client secret is
  // absent, which is a deployment problem, not something the visitor can fix.
  if (/unsupported provider|missing oauth secret|provider is not enabled/.test(message))
    return PROVIDER_UNAVAILABLE;
  if (/already registered|already been registered|already exists/.test(message))
    return BY_CODE.user_already_exists;
  if (/email not confirmed|not confirmed/.test(message))
    return BY_CODE.email_not_confirmed;
  if (/invalid login credentials|invalid credentials/.test(message))
    return BY_CODE.invalid_credentials;
  if (/password should be at least|weak password|at least \d+ characters/.test(message))
    return BY_CODE.weak_password;
  if (/rate limit|too many requests/.test(message))
    return BY_CODE.over_request_rate_limit;
  if (/new password should be different|same.*password/.test(message))
    return BY_CODE.same_password;

  return GENERIC;
}
