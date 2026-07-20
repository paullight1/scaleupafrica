import { Global, Module, type OnModuleDestroy, Inject } from "@nestjs/common";
import { createDb, DB, type Db } from "./client";
import { ENV, loadEnv, type Env } from "../config/env";

const DB_CONN = "DB_CONN";

/**
 * Global module providing the Drizzle instance via the `DB` token and the typed
 * `ENV` config. Services `@Inject(DB)` a typed `Db` handle; tests substitute one.
 */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: (): Env => loadEnv() },
    { provide: DB_CONN, useFactory: (env: Env) => createDb(env.DATABASE_URL), inject: [ENV] },
    {
      provide: DB,
      useFactory: (conn: { db: Db }) => conn.db,
      inject: [DB_CONN],
    },
  ],
  exports: [ENV, DB],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DB_CONN) private readonly conn: { close: () => Promise<void> }) {}
  async onModuleDestroy(): Promise<void> {
    await this.conn.close().catch(() => undefined);
  }
}
