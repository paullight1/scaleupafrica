import { z } from "zod";

/**
 * Zod-validated process.env -> typed Config. Crash fast on missing/invalid values
 * at boot (plan 07 §2.4). NONE of these ever appear in a VITE_-prefixed var.
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

  PAYSTACK_SECRET_KEY: z.string().optional(),

  CORS_ORIGINS: z.string().default("http://localhost:8080"),
});

export type Env = z.infer<typeof EnvSchema> & { corsOrigins: string[] };

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = {
    ...parsed.data,
    corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  };
  return cached;
}

export const ENV = "ENV";
