/**
 * Advisory password strength scoring.
 *
 * Deliberately NOT a gate: the only hard rule anywhere is MIN_PASSWORD_LENGTH.
 * Composition rules (must contain a digit, a symbol, …) push people towards
 * "Passw0rd!" and away from long passphrases, so we score and advise instead.
 *
 * Pure — no DOM, no React — so it is unit-tested directly.
 */

/** Hard minimum, mirrored by the Supabase project's own password policy. */
export const MIN_PASSWORD_LENGTH = 8;

/** Supabase/GoTrue rejects anything longer (bcrypt's 72-byte input limit). */
export const MAX_PASSWORD_LENGTH = 72;

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthScore;
  /** Short human label, or "" when there is nothing to say yet (empty input). */
  label: string;
  /** One actionable suggestion, or null when the password is already strong. */
  hint: string | null;
}

const LABELS: Record<StrengthScore, string> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

/**
 * The handful of passwords that dominate every credential-stuffing list.
 * A full dictionary belongs server-side (Supabase's HIBP check) — this is a
 * cheap client-side nudge for the most egregious cases only.
 */
const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "admin123",
  "letmein1",
  "welcome1",
  "abc12345",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
]);

function characterClasses(value: string): number {
  let classes = 0;
  if (/[a-z]/.test(value)) classes += 1;
  if (/[A-Z]/.test(value)) classes += 1;
  if (/\d/.test(value)) classes += 1;
  if (/[^A-Za-z0-9]/.test(value)) classes += 1;
  return classes;
}

/** The part of an email before the "@", lowercased. "" when there isn't one. */
function emailLocalPart(email: string | undefined): string {
  if (!email) return "";
  const at = email.indexOf("@");
  return (at === -1 ? email : email.slice(0, at)).trim().toLowerCase();
}

function clamp(score: number): StrengthScore {
  return Math.max(0, Math.min(4, score)) as StrengthScore;
}

export function scorePassword(
  password: string,
  opts: { email?: string } = {}
): PasswordStrength {
  if (!password) return { score: 0, label: "", hint: null };

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 0,
      label: LABELS[0],
      hint: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const lower = password.toLowerCase();

  if (COMMON.has(lower)) {
    return {
      score: 0,
      label: LABELS[0],
      hint: "This is one of the most-guessed passwords. Choose something else.",
    };
  }

  // Reusing the email as the password is the single most common weak choice
  // we can actually detect in the browser.
  const local = emailLocalPart(opts.email);
  if (local.length >= 3 && lower.includes(local)) {
    return {
      score: 1,
      label: LABELS[1],
      hint: "Avoid building your password out of your email address.",
    };
  }

  // A single repeated character or a straight run ("aaaaaaaa", "abcdefgh").
  if (/^(.)\1+$/.test(password)) {
    return {
      score: 0,
      label: LABELS[0],
      hint: "Repeating one character isn't a password. Mix it up.",
    };
  }

  let score = 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const classes = characterClasses(password);
  if (classes >= 2) score += 1;
  if (classes >= 3 && password.length >= 10) score += 1;

  const final = clamp(score);
  const hint =
    final >= 4
      ? null
      : password.length < 12
        ? "Longer is stronger — a few random words beats a short, complex password."
        : "Add another word, or mix in numbers or punctuation.";

  return { score: final, label: LABELS[final], hint };
}
