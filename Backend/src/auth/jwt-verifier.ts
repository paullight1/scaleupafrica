import {
  decodeProtectedHeader,
  jwtVerify,
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import type { AuthUser } from "./types";

export interface VerifierConfig {
  supabaseUrl: string;
  jwtSecret?: string; // HS256 legacy fallback
}

export class JwtVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtVerifyError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stateless Supabase-JWT verifier (jose). Verifies signature (JWKS for ES256/RS256,
 * HS256 secret for legacy) + iss/aud/exp + a UUID `sub`. Extracted from the guard so
 * it is unit-testable with tokens minted by test/jwt-fixtures.ts (plan 07 §4, §9).
 */
export class SupabaseJwtVerifier {
  private jwks?: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly hsKey?: Uint8Array;

  constructor(private readonly cfg: VerifierConfig) {
    this.issuer = `${cfg.supabaseUrl.replace(/\/$/, "")}/auth/v1`;
    if (cfg.jwtSecret) this.hsKey = new TextEncoder().encode(cfg.jwtSecret);
  }

  private getJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      // jose caches keys + re-fetches on unknown `kid` (handles Supabase rotation).
      this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    }
    return this.jwks;
  }

  async verify(token: string): Promise<AuthUser> {
    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new JwtVerifyError("malformed token");
    }

    const opts = { issuer: this.issuer, audience: "authenticated" as const };
    let payload: JWTPayload;
    try {
      if (alg === "HS256") {
        if (!this.hsKey) throw new JwtVerifyError("HS256 token but no secret configured");
        payload = (await jwtVerify(token, this.hsKey, opts)).payload;
      } else if (alg === "ES256" || alg === "RS256") {
        payload = (await jwtVerify(token, this.getJwks(), opts)).payload;
      } else {
        throw new JwtVerifyError(`unsupported alg: ${alg}`);
      }
    } catch (e) {
      if (e instanceof JwtVerifyError) throw e;
      throw new JwtVerifyError("verification failed");
    }

    const sub = payload.sub;
    if (!sub || !UUID_RE.test(sub)) throw new JwtVerifyError("missing/invalid sub");
    return { id: sub, email: typeof payload.email === "string" ? payload.email : undefined };
  }
}
