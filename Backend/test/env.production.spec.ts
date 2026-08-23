import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env";

const base = {
  NODE_ENV: "production",
  PORT: "3001",
  DATABASE_URL: "postgres://user:pass@db.example.com:5432/cresciva",
  SUPABASE_URL: "https://example.supabase.co",
  CORS_ORIGINS: "https://cresciva.example",
};

describe("production environment validation", () => {
  it("accepts explicit https production origins", () => {
    const env = parseEnv(base);
    expect(env.corsOrigins).toEqual(["https://cresciva.example"]);
  });

  it("rejects localhost-only CORS in production", () => {
    expect(() => parseEnv({ ...base, CORS_ORIGINS: "http://localhost:8080" })).toThrow(/CORS_ORIGINS/i);
  });

  it("rejects empty production CORS allowlists", () => {
    expect(() => parseEnv({ ...base, CORS_ORIGINS: "" })).toThrow(/CORS_ORIGINS/i);
  });
});
