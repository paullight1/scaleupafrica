import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = resolve(process.cwd(), "../supabase/functions/funding-notifications/index.ts");
const refreshPath = resolve(process.cwd(), "../supabase/functions/funding-source-refresh/index.ts");
const preferenceMigrationPath = resolve(process.cwd(), "../supabase/migrations/20260822070000_funding_notification_preferences.sql");
const deliveryMigrationPath = resolve(process.cwd(), "../supabase/migrations/20260822071000_funding_notification_delivery.sql");
const schemaPath = resolve(process.cwd(), "src/db/funding-intelligence-schema.ts");
const workerSource = existsSync(workerPath) ? readFileSync(workerPath, "utf8") : "";
const refreshSource = existsSync(refreshPath) ? readFileSync(refreshPath, "utf8") : "";
const preferenceMigrationSource = existsSync(preferenceMigrationPath) ? readFileSync(preferenceMigrationPath, "utf8") : "";
const deliveryMigrationSource = existsSync(deliveryMigrationPath) ? readFileSync(deliveryMigrationPath, "utf8") : "";
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

  it("preserves the legacy broad funding-email opt-out at queue and delivery time", () => {
    expect(preferenceMigrationSource).toContain("email_new_funding");
    expect(preferenceMigrationSource).toContain("email_new_matches = COALESCE(email_new_matches, email_new_funding)");
    expect(workerSource).toContain("email_new_funding,email_new_matches,email_deadline_alerts");
    expect(workerSource).toContain("masterFundingConsent");
    expect(workerSource).toContain("member_funding_email_opted_out");
  });

  it("sends through the existing dispatch funnel with event-id idempotency", () => {
    expect(workerSource).toContain("dispatch");
    expect(workerSource).toContain('kind: "funding_alert"');
    expect(workerSource).toContain("funding-alert:${event.id}");
    expect(workerSource).toContain("notification_events");
  });

  it("queues authoritative status/deadline transitions from the source refresh worker", () => {
    expect(refreshSource).toContain("enqueue_funding_transition_notifications");
    expect(refreshSource).toContain("_previous_status");
    expect(refreshSource).toContain("_next_status");
    expect(refreshSource).toContain("_previous_deadline_at");
    expect(refreshSource).toContain("_next_deadline_at");
    expect(refreshSource).toContain("_transition_key");
  });

  it("adds retry metadata without weakening queue status constraints", () => {
    expect(deliveryMigrationSource).toContain("attempt_count");
    expect(deliveryMigrationSource).toContain("last_error");
    expect(deliveryMigrationSource).toContain("processing_at");
    expect(deliveryMigrationSource).toContain("pending");
    expect(deliveryMigrationSource).toContain("failed");
  });

  it("terminalizes an abandoned exhausted lease instead of leaving a zombie pending row", () => {
    expect(deliveryMigrationSource).toContain("delivery_attempts_exhausted");
    expect(deliveryMigrationSource).toContain("attempt_count >= 3");
    expect(deliveryMigrationSource).toContain("processing_at < now() - interval '10 minutes'");
    expect(deliveryMigrationSource).toContain("SET status = 'failed'");
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
