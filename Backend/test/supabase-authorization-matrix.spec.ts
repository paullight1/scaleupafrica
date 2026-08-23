import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const matrixPath = fileURLToPath(new URL("../../supabase/tests/authorization-matrix.sql", import.meta.url));
const matrix = readFileSync(matrixPath, "utf8");

describe("Supabase authorization matrix contract", () => {
  it("covers RLS, table grants, column privacy and storage boundaries", () => {
    expect(matrix).toContain("relrowsecurity");
    expect(matrix).toContain("has_table_privilege");
    expect(matrix).toContain("has_column_privilege");
    expect(matrix).toContain("pg_policies");
    expect(matrix).toContain("profile-media");
    expect(matrix).toContain("auth.uid");
  });

  it.each([
    "grant_annual_access",
    "confirm_business_identity",
    "record_funding_status_check",
    "enqueue_funding_transition_notifications",
    "claim_funding_notification_events",
  ])("keeps %s behind service-role execution checks", (functionName) => {
    expect(matrix).toContain(functionName);
    expect(matrix).toContain("has_function_privilege");
  });

  it.each(["admin_set_role", "update_funding_source_and_invalidate"])(
    "requires an explicit authorization contract for %s",
    (functionName) => {
      expect(matrix).toContain(functionName);
      expect(matrix).toContain("pg_get_functiondef");
    },
  );

  it("requires pinned search_path on SECURITY DEFINER routines", () => {
    expect(matrix).toContain("prosecdef");
    expect(matrix).toContain("search_path=%");
  });
});
