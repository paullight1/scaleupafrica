import { supabase } from "@shared/integrations/supabase/client";

export interface EngineSource {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  category?: string;
  last_scraped_at?: string | null;
}

export interface EngineRun {
  id: string;
  status: string;
  source_name?: string | null;
  opportunities_found?: number;
  items_found?: number;
  urls_scraped?: number;
  warnings?: Array<{ name?: string | null }>;
  created_at?: string;
  started_at?: string;
  completed_at?: string | null;
}

export interface EngineStatus {
  success?: boolean;
  database?: { configured?: boolean; reachable?: boolean; connected?: boolean; status?: string };
  ai?: { provider?: string; configured?: boolean; deepseekConfigured?: boolean; enabled?: boolean; status?: string };
  scraper?: { schedulerEnabled?: boolean; scheduler_enabled?: boolean; running?: boolean };
  runtime?: { version?: string; deployment?: string; environment?: string };
  integration?: { client?: string; opportunityScope?: string; tag?: string };
}

export interface EngineGrant {
  id: string;
  title: string;
  summary?: string | null;
  organization?: string | null;
  status?: string | null;
  close_date?: string | null;
  source_url?: string | null;
  application_url?: string | null;
  apply_url?: string | null;
  canonical_url?: string | null;
  tags?: string[];
  created_at?: string | null;
}

type EngineAction = "status" | "sources" | "runs" | "opportunities" | "start-run";

async function request<T>(
  action: EngineAction,
  path: string,
  payload: Record<string, unknown> = {},
  init?: RequestInit,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your admin session has expired.");

  if (import.meta.env.DEV) {
    const response = await fetch(`/admin/__funding-engine${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) throw new Error(body?.error?.message ?? "The opportunity engine request failed.");
    return body as T;
  }

  const { data, error } = await supabase.functions.invoke("edutu-grants", {
    body: { action, ...payload },
  });
  if (error) throw new Error("The Edutu Engine API request failed.");
  return data as T;
}

export const fundingEngineApi = {
  status: () => request<EngineStatus>("status", "/status"),
  sources: () => request<EngineSource[]>("sources", "/sources"),
  runs: () => request<EngineRun[]>("runs", "/runs?limit=20", { limit: 20 }),
  opportunities: () => request<EngineGrant[]>("opportunities", "/opportunities?limit=50", { limit: 50 }),
  startRun: (input: { sourceId?: number; allSources?: boolean; maxPages: number; incremental: boolean }) =>
    request<{ success: boolean; status: string; error?: string }>("start-run", "/runs", input, {
      method: "POST",
      body: JSON.stringify({ ...input, opportunityScope: "grants" }),
    }),
};
