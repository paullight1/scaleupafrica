import { supabase } from "@/integrations/supabase/client";
import type { ApiErrorCode } from "./types";

/**
 * Typed fetch wrapper for the NestJS API (Plan 07). The ONLY place the Supabase
 * client and the API client touch: it reads the current session and attaches the
 * access token. On a single 401 it forces a refresh and retries once.
 *
 * Base URL: `VITE_API_URL` (empty in dev -> relative `/api` -> the Vite dev proxy).
 * Every failure throws a typed `ApiError` so hooks surface `error` and pages render
 * <ErrorState> — never an empty/paywall state on a fetch failure (FOUNDATION §2).
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const PREFIX = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode | string,
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = "ERROR";
  let message = res.statusText || "Request failed";
  let fields: Record<string, string[]> | undefined;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      fields = body.error.fields;
    }
  } catch {
    /* non-JSON error body — keep defaults */
  }
  return new ApiError(code, message, res.status, fields);
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Query params; undefined/null/"" values are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${BASE_URL}${PREFIX}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

async function doFetch(path: string, opts: RequestOptions, retryOn401: boolean): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(await authHeader()),
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401 && retryOn401) {
    await supabase.auth.refreshSession();
    return doFetch(path, opts, false);
  }
  return res;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await doFetch(path, opts, true);
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T; // e.g. empty 200 from /funding/latest
  return JSON.parse(text) as T;
}
