import { z } from "zod";

/**
 * Zod-validated process.env -> typed Config. Crash fast on missing/invalid values
 * at boot. NONE of these ever appear in a VITE_-prefixed variable.
 *
 * Payment settlement remains owned by Supabase Edge Functions. The optional
 * Bachs fields are retained for a future, explicit Backend cutover only.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid postgres connection string"),

  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  AI_GATEWAY_URL: z.string().url().default("https://ai.gateway.lovable.dev/v1/chat/completions"),
  AI_GATEWAY_KEY: z.string().optional(),
  AI_MODEL: z.string().default("google/gemini-2.5-pro"),

  BACHS_SECRET_KEY: z.string().optional(),
  BACHS_BASE_URL: z
    .enum(["https://sandbox-api.bachs.io", "https://api.bachs.io"])
    .optional(),
  BACHS_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  BACHS_ORGANIZATION_ID: z.string().optional(),

  CORS_ORIGINS: z.string().default("http://localhost:8080"),
});

export type Env = z.infer<typeof EnvSchema> & { corsOrigins: string[] };

let cached: Env | null = null;

function parseCorsOrigins(raw: string): string[] {
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function assertProductionOrigins(origins: string[]): void {
  if (origins.length === 0) {
    throw new Error("Invalid environment configuration:\n  - CORS_ORIGINS: production requires an explicit allowlist");
  }

  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`Invalid environment configuration:\n  - CORS_ORIGINS: invalid origin ${origin}`);
    }

    const host = url.hostname.toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (url.protocol !== "https:" || local || origin === "*") {
      throw new Error("Invalid environment configuration:\n  - CORS_ORIGINS: production origins must be explicit non-local HTTPS origins");
    }
  }
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const corsOrigins = parseCorsOrigins(parsed.data.CORS_ORIGINS);
  if (parsed.data.NODE_ENV === "production") assertProductionOrigins(corsOrigins);

  return { ...parsed.data, corsOrigins };
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached && source === process.env) return cached;
  const env = parseEnv(source);
  if (source === process.env) cached = env;
  return env;
}

export const ENV = "ENV";
