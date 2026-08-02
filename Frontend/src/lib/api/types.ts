/**
 * Frontend view of the shared API contracts. TYPE-ONLY re-export so the Vite bundle
 * never pulls the server's zod runtime — the single source of truth lives in
 * shared/contracts/ (also runtime-imported by the NestJS API). See FOUNDATION §8.3.
 */
export type * from "../../../shared/contracts";
