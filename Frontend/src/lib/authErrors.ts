/**
 * Maps raw Supabase auth errors to plain-language, brand-voice copy.
 * Never leak a raw Supabase message to the UI (IMPROVEMENTS §2.5).
 * Match on `AuthError.code` first (supabase-js v2), fall back to message
 * substring, then to a generic fallback. See docs/plans/02-auth-flow.md §4.2.
 */

export type FriendlyError = { title: string; message: string };

const GENERIC: FriendlyError = {
  title: "Something went wrong",
  message: "Something went wrong on our side. Please try again.",
};

const BY_CODE: Record<string, FriendlyError> = {
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
    message: "Please choose a longer password (at least 6 characters).",
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
};

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
  if (/already registered|already been registered|already exists/.test(message))
    return BY_CODE.user_already_exists;
  if (/email not confirmed|not confirmed/.test(message))
    return BY_CODE.email_not_confirmed;
  if (/invalid login credentials|invalid credentials/.test(message))
    return BY_CODE.invalid_credentials;
  if (/password should be at least|weak password|at least 6/.test(message))
    return BY_CODE.weak_password;
  if (/rate limit|too many requests/.test(message))
    return BY_CODE.over_request_rate_limit;
  if (/new password should be different|same.*password/.test(message))
    return BY_CODE.same_password;

  return GENERIC;
}
