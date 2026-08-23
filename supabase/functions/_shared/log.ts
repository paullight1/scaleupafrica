export type EdgeLogLevel = "info" | "warn" | "error";
export type EdgeLogScalar = string | number | boolean | null;

export type EdgeLogEvent = {
  level: EdgeLogLevel;
  event: string;
  request_id?: string;
  route?: string;
  duration_ms?: number;
  status?: number;
  code?: string;
  reference?: string;
  metadata?: Record<string, EdgeLogScalar>;
};

const SENSITIVE_KEY_PARTS = [
  "authorization",
  "token",
  "secret",
  "password",
  "service_role",
  "gateway_response",
  "email",
  "phone",
  "whatsapp",
  "jwt",
  "cookie",
] as const;

function safeMetadata(metadata?: Record<string, EdgeLogScalar>): Record<string, EdgeLogScalar> | undefined {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata).filter(([key]) => {
    const normalized = key.toLowerCase();
    return !SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function edgeLog(event: EdgeLogEvent): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
    metadata: safeMetadata(event.metadata),
  });

  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else console.log(line);
}
