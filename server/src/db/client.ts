import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * postgres-js + drizzle. The direct Postgres connection BYPASSES RLS (connects as
 * `postgres`, so auth.uid() is NULL) — which is exactly why every handler derives
 * ownership from the JWT `sub`, never from client input (plan 07 §2.4, §7.2).
 *
 * `prepare: false` is MANDATORY with the Supavisor transaction pooler (port 6543).
 * Created lazily so `import`ing schema/types never opens a socket (keeps build +
 * unit tests DB-free).
 */
export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(databaseUrl: string): { db: Db; close: () => Promise<void> } {
  const sql = postgres(databaseUrl, { prepare: false, max: 10 });
  const db = drizzle(sql, { schema });
  return { db, close: () => sql.end({ timeout: 5 }) };
}

export const DB = "DB";
