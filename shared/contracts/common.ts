import { z } from "zod";

/**
 * Cross-cutting contracts shared by the NestJS API (runtime validation) and the
 * frontend API client (types only). Pure zod — no Node/browser/framework imports —
 * so it is safe to type-import from the Vite app and runtime-import from the server.
 */

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ErrorSchema>;

/** Stable machine-readable error codes returned by the API. */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SUBSCRIPTION_REQUIRED"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "INTERNAL";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}
