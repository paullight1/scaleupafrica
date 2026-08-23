export type LogLevel = "info" | "warn" | "error";
export type LogScalar = string | number | boolean | null;

export type LogEvent = {
  level: LogLevel;
  event: string;
  request_id?: string;
  route?: string;
  duration_ms?: number;
  status?: number;
  code?: string;
  reference?: string;
  metadata?: Record<string, LogScalar>;
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

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeMetadata(metadata?: Record<string, LogScalar>): Record<string, LogScalar> | undefined {
  if (!metadata) return undefined;
  const safe = Object.fromEntries(Object.entries(metadata).filter(([key]) => !isSensitiveKey(key)));
  return Object.keys(safe).length ? safe : undefined;
}

export function createLogEvent(event: LogEvent): LogEvent {
  return {
    ...event,
    metadata: sanitizeMetadata(event.metadata),
  };
}

export function writeLog(event: LogEvent): void {
  const safe = createLogEvent(event);
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...safe });
  if (safe.level === "error") console.error(line);
  else if (safe.level === "warn") console.warn(line);
  else console.info(line);
}
