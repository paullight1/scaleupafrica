import { sanitizeExternalUrl } from "../contracts";

export { sanitizeExternalUrl };

/** Clamp a string to a max length (defensive against oversized model output). */
export function clamp(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
