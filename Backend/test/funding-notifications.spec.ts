import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = resolve(process.cwd(), "../supabase/functions/funding-notifications/index.ts");
const migrationPath = resolve(process.cwd(), "../supabase/migrations/20260822071000_funding_notification_delivery.sql");
const schemaPath = resolve(process.cwd(), "src/db/funding-intelligence-schema.ts");
const workerSource = existsSync(workerPath) ? readFileSync(workerPath, "utf8") : "";
const migrationSource = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const schemaSource = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "";

describe("Funding notification delivery trust boundary", () => {
  it("uses a dedicated scheduler secret and bounded batch", () => {
    expect(workerSource).toContain("FUNDING_NOTIFICATION_SECRET");
    expect(workerSource).toContain("MAX_BATCH = 25");
    expect(workerSource).toContain("timingSafeEqual");
  });

  it("rechecks member workflow and preferences before delivery", () => {
    expect(workerSource).toContain("member_opportunity_state");
    expect(workerSource).toContain("user_preferences");
    expect(workerSource).toContain("saved");
    expect(workerSource).toContain("preparing");
    expect(workerSource).toContain("suppressed");
  });

  it("sends through the existing dispatch funnel with event-id idempotency", () => {
    expect(workerSource).toContain("dispatch");
    expect(workerSource).toContain('kind: "funding_alert"');
    expect(workerSource).toContain("funding-alert:${event.id}");
    expect(workerSource).toContain("notification_events");
  });

  it("adds retry metadata without weakening queue status constraints", () => {
    expect(migrationSource).toContain("attempt_count");
    expect(migrationSource).toContain("last_error");
    expect(migrationSource).toContain("processing_at");
    expect(migrationSource).toContain("pending");
    expect(migrationSource).toContain("failed");
  });

  it("mirrors notification delivery state in the Backend schema", () => {
    expect(schemaSource).toContain("notificationEvents");
    expect(schemaSource).toContain('"notification_events"');
    expect(schemaSource).toContain("attemptCount");
    expect(schemaSource).toContain("processingAt");
    expect(schemaSource).toContain("lastError");
  });

  it("never copies raw source bodies into the notification worker", () => {
    expect(workerSource).not.toContain("source_body");
    expect(workerSource).not.toContain("source_text");
    expect(workerSource).not.toContain("fetched.body");
  });
});
