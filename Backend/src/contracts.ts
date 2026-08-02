/**
 * Server-side barrel for the shared zod contracts (single source of truth in
 * Shared/contracts/, also type-imported by the web apps). Compiled into
 * dist/Shared/* alongside the server via rootDir=".." (see tsconfig.build.json).
 */
export * from "../../Shared/contracts";
