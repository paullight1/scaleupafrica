export type EdutuGrantAction =
  | "status"
  | "sources"
  | "runs"
  | "opportunities"
  | "start-run";

type ProxyInput = {
  action?: unknown;
  limit?: unknown;
  sourceId?: unknown;
  allSources?: unknown;
  maxPages?: unknown;
  incremental?: unknown;
};

export type EdutuGrantProxyOptions = {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
};

export async function proxyEdutuGrantRequest(
  input: ProxyInput,
  options: EdutuGrantProxyOptions,
): Promise<Response> {
  const fetcher = options.fetcher ?? fetch;
  const request = buildUpstreamRequest(input);
  if (!request) return jsonError("INVALID_ACTION", "Unknown engine action", 400);

  const baseUrl = validBaseUrl(options.baseUrl);
  if (!baseUrl || options.apiKey.trim().length < 32) {
    return jsonError("ENGINE_NOT_CONFIGURED", "The Edutu Engine API is not configured", 503);
  }

  let response: Response;
  try {
    response = await fetcher(
      `${baseUrl}/api/integrations/cresciva/engine${request.path}`,
      {
        method: request.method,
        signal: AbortSignal.timeout(20_000),
        headers: {
          "Content-Type": "application/json",
          "X-Cresciva-Engine-Key": options.apiKey.trim(),
          "X-Request-Id": crypto.randomUUID(),
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      },
    );
  } catch {
    return jsonError("ENGINE_UNREACHABLE", "The Edutu Engine API could not be reached", 502);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return jsonError(
      "ENGINE_UPSTREAM_ERROR",
      "The Edutu Engine API rejected the request",
      502,
      { upstreamStatus: response.status },
    );
  }
  return Response.json(payload, {
    status: request.action === "start-run" ? 202 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function buildUpstreamRequest(input: ProxyInput): {
  action: EdutuGrantAction;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
} | null {
  switch (input.action) {
    case "status":
      return { action: input.action, method: "GET", path: "/status" };
    case "sources":
      return { action: input.action, method: "GET", path: "/sources" };
    case "runs":
      return { action: input.action, method: "GET", path: `/runs?limit=${integer(input.limit, 20, 1, 100)}` };
    case "opportunities":
      return { action: input.action, method: "GET", path: `/opportunities?limit=${integer(input.limit, 50, 1, 200)}` };
    case "start-run": {
      const sourceId = optionalInteger(input.sourceId, 1, Number.MAX_SAFE_INTEGER);
      return {
        action: input.action,
        method: "POST",
        path: "/runs",
        body: {
          ...(sourceId === undefined ? {} : { sourceId }),
          allSources: sourceId === undefined ? true : input.allSources === true,
          maxPages: integer(input.maxPages, 3, 1, 20),
          incremental: input.incremental !== false,
          opportunityScope: "grants",
        },
      };
    }
    default:
      return null;
  }
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function optionalInteger(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function validBaseUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function jsonError(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): Response {
  return Response.json({ error: { code, message, ...details } }, { status });
}
