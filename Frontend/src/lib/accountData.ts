import { supabase } from "@shared/integrations/supabase/client";

export const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";

export type AccountExport = {
  format: "cresciva-account-export-v1";
  generated_at: string;
  account: { id: string; email: string | null; created_at: string | null };
  [key: string]: unknown;
};

type FunctionErrorLike = Error & { context?: Response };

async function functionErrorCode(error: unknown): Promise<string | null> {
  const context = (error as FunctionErrorLike | null)?.context;
  if (!context || typeof context.clone !== "function") return null;
  try {
    const payload = await context.clone().json() as { error?: unknown };
    return typeof payload?.error === "string" ? payload.error : null;
  } catch {
    return null;
  }
}

export async function exportAccountData(): Promise<AccountExport> {
  const { data, error } = await supabase.functions.invoke("account-data", {
    body: { action: "export" },
  });
  if (error) throw error;
  return data as AccountExport;
}

export async function deleteAccount(confirmation: string): Promise<void> {
  if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    throw new Error("Type the confirmation phrase exactly before deleting your account.");
  }

  const { data, error } = await supabase.functions.invoke("account-data", {
    body: { action: "delete", confirmation },
  });

  if (error) {
    const code = await functionErrorCode(error);
    if (code === "recent_auth_required") {
      throw new Error("For your security, sign out and sign back in before deleting your account.");
    }
    if (code === "confirmation_required") {
      throw new Error("Type the confirmation phrase exactly before deleting your account.");
    }
    throw error;
  }

  if (data?.error === "recent_auth_required") {
    throw new Error("For your security, sign out and sign back in before deleting your account.");
  }
  if (!data?.deleted) throw new Error("Account deletion did not complete.");
}

export function accountExportFilename(now = new Date()): string {
  return `cresciva-account-export-${now.toISOString().slice(0, 10)}.json`;
}
