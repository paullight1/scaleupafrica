import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

const STATUS_CODE: Record<number, string> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
  502: "UPSTREAM_ERROR",
  504: "TIMEOUT",
};

/**
 * Normalizes every error into `{ error: { code, message, fields? } }`. Handlers that
 * throw HttpException with an already-shaped body are passed through unchanged.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === "object" && "error" in body) {
        res.status(status).json(body);
        return;
      }
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] })?.message ?? exception.message);
      res.status(status).json({
        error: {
          code: STATUS_CODE[status] ?? "ERROR",
          message: Array.isArray(message) ? message.join(", ") : message,
        },
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
    });
  }
}
