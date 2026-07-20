/**
 * Server-side barrel for the shared zod contracts (single source of truth in
 * shared/contracts/, also type-imported by the Vite app). Compiled into
 * dist/shared/* alongside the server via rootDir=".." (see tsconfig.build.json).
 */
export * from "../../shared/contracts";
