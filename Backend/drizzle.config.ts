import { defineConfig } from "drizzle-kit";

/**
 * Drizzle is a READ/WRITE query layer over an externally-owned schema, never a
 * migration tool here. `supabase/migrations/*.sql` is the ONLY DDL pipeline
 * (FOUNDATION §8.3). `db:pull` introspects into a scratch dir purely as a DRIFT
 * CHECK against src/db/schema.ts — never run generate/push/migrate.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/_introspect", // scratch output for pull; git-ignored
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  schemaFilter: ["public"], // never touch auth/storage schemas
});
