import { describe, expect, it, vi } from "vitest";
import { createLogEvent, writeLog } from "../src/observability/logger";

describe("structured logger", () => {
  it("drops sensitive metadata keys while preserving safe operational fields", () => {
    const event = createLogEvent({
      level: "error",
      event: "api.request.failed",
      request_id: "req-1",
      metadata: {
        authorization: "Bearer secret",
        token: "secret",
        password: "secret",
        email: "founder@example.com",
        phone: "+234000000",
        route_group: "funding",
        retryable: true,
        result_count: 3,
      },
    });

    expect(event.metadata).toEqual({ route_group: "funding", retryable: true, result_count: 3 });
  });

  it("writes a single JSON log line", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    writeLog({ level: "info", event: "funding.search.complete", status: 200 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(() => JSON.parse(String(spy.mock.calls[0][0]))).not.toThrow();
    spy.mockRestore();
  });
});
