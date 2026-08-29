// Bounded external evidence retrieval for Funding Intelligence.
//
// This helper is deliberately stricter than a general HTTP client. Every URL and
// redirect target is validated before fetch; DNS answers are checked against
// private/link-local/metadata ranges; response type, time and bytes are bounded.

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 5;

const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/json"] as const;

// Security ranges blocked by this helper:
// 127.0.0.0/8 localhost
// 10.0.0.0/8 RFC1918
// 172.16.0.0/12 RFC1918
// 192.168.0.0/16 RFC1918
// 169.254.0.0/16 link-local (includes 169.254.169.254 cloud metadata)
// ::1 IPv6 loopback
// fc00::/7 IPv6 unique-local
// fe80::/10 IPv6 link-local
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export type SafeExternalFetchError =
  | "invalid_url"
  | "blocked_host"
  | "dns_failed"
  | "redirect_limit"
  | "redirect_missing_location"
  | "timeout"
  | "network_error"
  | "http_status"
  | "unsupported_content_type"
  | "body_too_large";

export type ExternalDnsResolver = (hostname: string) => Promise<string[]>;

export interface SafeExternalFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  /**
   * Runtime-neutral DNS seam. Deno source workers use Deno.resolveDns by
   * default; Node certification injects node:dns lookup so both paths keep the
   * same private-network/redirect/body security policy.
   */
  resolveDns?: ExternalDnsResolver;
}

export interface SafeExternalFetchSuccess {
  ok: true;
  url: string;
  status: number;
  contentType: string;
  body: string;
  bytes: number;
}

export interface SafeExternalFetchFailure {
  ok: false;
  url: string | null;
  status: number | null;
  error: SafeExternalFetchError;
}

export type SafeExternalFetchResult = SafeExternalFetchSuccess | SafeExternalFetchFailure;

export async function safeExternalFetch(
  rawUrl: string,
  options: SafeExternalFetchOptions = {},
): Promise<SafeExternalFetchResult> {
  const timeoutMs = boundedInt(options.timeoutMs, DEFAULT_TIMEOUT_MS, 500, 30_000);
  const maxBytes = boundedInt(options.maxBytes, DEFAULT_MAX_BYTES, 1_024, 5 * 1024 * 1024);
  const maxRedirects = boundedInt(options.maxRedirects, DEFAULT_MAX_REDIRECTS, 0, 5);
  const resolveDns = options.resolveDns ?? resolvePublicAddresses;
  const deadline = Date.now() + timeoutMs;

  let current: URL;
  try {
    current = await validateExternalUrl(rawUrl, resolveDns);
  } catch (error) {
    return failure(null, null, classifyValidationError(error));
  }

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return failure(current.href, null, "timeout");

    let response: Response;
    try {
      response = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(remainingMs),
        headers: {
          Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.1",
          "User-Agent": "CrescivaFundingIntelligence/1.0",
          ...options.headers,
        },
      });
    } catch (error) {
      if (isTimeout(error)) return failure(current.href, null, "timeout");
      return failure(current.href, null, "network_error");
    }

    if (isRedirect(response.status)) {
      if (redirectCount >= maxRedirects) {
        return failure(current.href, response.status, "redirect_limit");
      }
      const location = response.headers.get("location");
      if (!location) return failure(current.href, response.status, "redirect_missing_location");
      try {
        current = await validateExternalUrl(new URL(location, current).href, resolveDns);
      } catch (error) {
        return failure(current.href, response.status, classifyValidationError(error));
      }
      continue;
    }

    if (!response.ok) return failure(current.href, response.status, "http_status");

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      return failure(current.href, response.status, "unsupported_content_type");
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      try {
        await response.body?.cancel();
      } catch {
        // Best-effort connection release.
      }
      return failure(current.href, response.status, "body_too_large");
    }

    const bodyResult = await readBoundedBody(response, maxBytes);
    if (bodyResult.ok === false) {
      return failure(current.href, response.status, bodyResult.error);
    }

    return {
      ok: true,
      url: current.href,
      status: response.status,
      contentType,
      body: bodyResult.body,
      bytes: bodyResult.bytes,
    };
  }

  return failure(current.href, null, "redirect_limit");
}

export async function validateExternalUrl(
  rawUrl: string,
  resolveDns: ExternalDnsResolver = resolvePublicAddresses,
): Promise<URL> {
  if (typeof rawUrl !== "string" || !rawUrl.trim() || rawUrl.length > 2_048) {
    throw new SafeFetchValidationError("invalid_url");
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new SafeFetchValidationError("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchValidationError("invalid_url");
  }
  if (url.username || url.password) throw new SafeFetchValidationError("invalid_url");

  url.hash = "";
  const host = normalizeHostname(url.hostname);
  if (!host || isBlockedHostname(host) || isBlockedIp(host)) {
    throw new SafeFetchValidationError("blocked_host");
  }

  if (!isIpLiteral(host)) {
    let addresses: string[];
    try {
      addresses = await resolveDns(host);
    } catch {
      throw new SafeFetchValidationError("dns_failed");
    }
    const uniqueAddresses = Array.from(new Set(addresses.map(String).map(normalizeHostname).filter(Boolean)));
    if (!uniqueAddresses.length) throw new SafeFetchValidationError("dns_failed");
    if (uniqueAddresses.some(isBlockedIp)) throw new SafeFetchValidationError("blocked_host");
  }

  return url;
}

class SafeFetchValidationError extends Error {
  readonly code: "invalid_url" | "blocked_host" | "dns_failed";

  constructor(code: "invalid_url" | "blocked_host" | "dns_failed") {
    super(code);
    this.code = code;
  }
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  type DenoDnsRuntime = {
    resolveDns: (hostname: string, recordType: "A" | "AAAA") => Promise<string[]>;
  };
  const denoRuntime = (
    globalThis as typeof globalThis & { Deno?: DenoDnsRuntime }
  ).Deno;
  if (!denoRuntime) throw new Error("Deno DNS runtime is unavailable");

  const results = await Promise.allSettled([
    denoRuntime.resolveDns(hostname, "A"),
    denoRuntime.resolveDns(hostname, "AAAA"),
  ]);
  const addresses: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") addresses.push(...result.value.map(String));
  }
  return Array.from(new Set(addresses));
}

function normalizeHostname(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
}

function isBlockedHostname(hostname: string): boolean {
  return (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  );
}

function isIpLiteral(hostname: string): boolean {
  return parseIpv4(hostname) !== null || hostname.includes(":");
}

function isBlockedIp(raw: string): boolean {
  const value = normalizeHostname(raw);
  const ipv4 = parseIpv4(value);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  if (!value.includes(":")) return false;
  const ip = value.toLowerCase();
  if (ip === "::" || ip === "::1") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const first = Number.parseInt(ip.split(":", 1)[0] || "0", 16);
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  if (ip.startsWith("::ffff:")) {
    const mapped = parseIpv4(ip.slice("::ffff:".length));
    return mapped ? isBlockedIp(mapped.join(".")) : true;
  }
  return false;
}

function parseIpv4(raw: string): [number, number, number, number] | null {
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN));
  if (nums.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return nums as [number, number, number, number];
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<{ ok: true; body: string; bytes: number } | { ok: false; error: "body_too_large" }> {
  if (!response.body) return { ok: true, body: "", bytes: 0 };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("body_too_large");
        return { ok: false, error: "body_too_large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: new TextDecoder().decode(joined), bytes: total };
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

function boundedInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value as number)));
}

function classifyValidationError(error: unknown): "invalid_url" | "blocked_host" | "dns_failed" {
  return error instanceof SafeFetchValidationError ? error.code : "invalid_url";
}

function failure(
  url: string | null,
  status: number | null,
  error: SafeExternalFetchError,
): SafeExternalFetchFailure {
  return { ok: false, url, status, error };
}
