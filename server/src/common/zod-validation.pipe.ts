import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type ZodTypeAny, z } from "zod";

/**
 * Validates a payload against a zod schema, returning the parsed (and transformed)
 * value. Use as a route-level pipe: `@Body(new ZodBody(MySchema))`. Errors become a
 * 400 with `{ error: { code: "VALIDATION_ERROR", message, fields } }`.
 */
export class ZodBody<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown, _meta: ArgumentMetadata): z.infer<T> {
    try {
      return this.schema.parse(value);
    } catch (e) {
      if (e instanceof ZodError) throw validationError(e);
      throw e;
    }
  }
}

export function validationError(e: ZodError): BadRequestException {
  const fields: Record<string, string[]> = {};
  for (const issue of e.issues) {
    const key = issue.path.join(".") || "(root)";
    (fields[key] ??= []).push(issue.message);
  }
  return new BadRequestException({
    error: { code: "VALIDATION_ERROR", message: "Some fields need attention.", fields },
  });
}
