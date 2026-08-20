/**
 * Frontend view of the shared API contracts. TYPE-ONLY re-export so the Vite
 * bundle does not pull the server's zod runtime. The single source of truth
 * lives in Shared/contracts/ and is also consumed by the NestJS API.
 */
export type * from "../../../../Shared/contracts";
