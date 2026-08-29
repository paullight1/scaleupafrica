type Dependencies = {
  authenticate: (request: Request) => Promise<string | null>;
  isStaff: (userId: string) => Promise<boolean>;
  fetchMetadata: (url: string) => Promise<
    | { ok: true; metadata: unknown }
    | { ok: false; error: string }
  >;
};

export async function handleResourceLinkPreview(
  request: Request,
  dependencies: Dependencies,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const userId = await dependencies.authenticate(request);
  if (!userId) return json({ error: "unauthorized" }, 401);
  if (!(await dependencies.isStaff(userId))) return json({ error: "forbidden" }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const url = objectString(body, "url");
  if (!url || url.length > 2_048) return json({ error: "invalid_url" }, 400);

  const result = await dependencies.fetchMetadata(url);
  return result.ok
    ? json({ metadata: result.metadata })
    : json({ error: result.error }, 422);
}

function objectString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
