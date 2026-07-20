import { SignJWT } from "jose";

export const TEST_SUPABASE_URL = "https://test.supabase.co";
export const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
export const TEST_SECRET = "super-secret-hs256-test-key";
export const TEST_SUB = "11111111-1111-4111-8111-111111111111";

const key = new TextEncoder().encode(TEST_SECRET);

interface TokenOpts {
  sub?: string;
  email?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string; // e.g. "1h"; use "-1h" style via exp override
  expSecondsFromNow?: number;
}

/** Mint an HS256 Supabase-style token for guard/verifier unit tests. */
export async function signHs256(opts: TokenOpts = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = opts.expSecondsFromNow !== undefined ? now + opts.expSecondsFromNow : now + 3600;
  return new SignJWT({ email: opts.email ?? "founder@example.com" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(opts.sub ?? TEST_SUB)
    .setIssuer(opts.issuer ?? TEST_ISSUER)
    .setAudience(opts.audience ?? "authenticated")
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
}
