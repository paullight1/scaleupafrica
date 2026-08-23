import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { parseOpportunities, type Opportunity } from "../contracts";

export type GatewayErrorCode = "rate_limited" | "timeout" | "invalid_ai_output" | "unavailable";

export class GatewayError extends Error {
  constructor(public readonly code: GatewayErrorCode) {
    super(code);
    this.name = "GatewayError";
  }
}

const GATEWAY_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = `You are an AI-assisted funding discovery analyst for African SMEs. Return ONLY valid JSON matching the requested schema.

CRITICAL RULES:
- Return between 0 and 10 candidate opportunities. ZERO is valid. Prefer fewer plausible candidates over padding.
- NEVER invent a fictional funder, program, amount, URL, deadline, or recipient.
- If you are not confident a program exists, omit it.
- If the CURRENT application deadline is unknown, use an empty string. NEVER substitute a typical or historical closing month for a current deadline.
- Never claim that a result is verified, current, open, or source-checked unless that fact is actually known from your available information.
- Past recipients must be empty unless genuinely known.
- Focus on relevance to the user's query rather than forcing diversity or a minimum number of categories.
- Cresciva will label every result from this call as AI-assisted and unverified until a separate source-verification process confirms it.`;

function userPrompt(keywords: string): string {
  return `Search request: "${keywords}"

Return a JSON object with an "opportunities" array containing 0-10 items. Each item may contain:
{
  "title": string,
  "funder": string,
  "type": "Grant" | "Competition" | "Accelerator" | "Incubator" | "Fellowship" | "Scholarship" | "Pitch Event" | "Development Finance",
  "summary": string,
  "amount": string (empty if unknown),
  "opens": string (empty if unknown),
  "deadline": string (CURRENT application deadline only; empty string if unknown),
  "eligibility": string,
  "url": string (real http/https program or funder URL, empty if unknown),
  "tags": string[],
  "funder_about": string,
  "sdg_focus": string[],
  "past_recipients": [ { "business_name": string, "founder_name": string, "website": string, "note": string } ],
  "application_tips": string[],
  "travel_component": string,
  "important_notes": string
}

Do not add filler to reach a target count. An empty opportunities array is better than uncertain or fabricated records. Never claim a result is verified.`;
}

export const fundingDiscoveryPrompt = {
  system: SYSTEM_PROMPT,
  user: userPrompt,
} as const;

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger("AiGateway");
  constructor(@Inject(ENV) private readonly env: Env) {}

  async curate(keywords: string): Promise<Opportunity[]> {
    if (!this.env.AI_GATEWAY_KEY) throw new GatewayError("unavailable");

    let res: Response;
    try {
      res = await fetch(this.env.AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.AI_GATEWAY_KEY}`,
        },
        body: JSON.stringify({
          model: this.env.AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(keywords) },
          ],
          response_format: { type: "json_object" },
          max_tokens: 9000,
        }),
        signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") throw new GatewayError("timeout");
      throw new GatewayError("unavailable");
    }

    if (!res.ok) {
      this.logger.warn(`AI gateway ${res.status}`);
      if (res.status === 429) throw new GatewayError("rate_limited");
      throw new GatewayError("invalid_ai_output");
    }

    let content: string;
    try {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = json.choices?.[0]?.message?.content ?? "{}";
    } catch {
      throw new GatewayError("invalid_ai_output");
    }

    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch {
      throw new GatewayError("invalid_ai_output");
    }

    const rawArray = Array.isArray((parsedRaw as { opportunities?: unknown[] })?.opportunities)
      ? (parsedRaw as { opportunities: unknown[] }).opportunities
      : [];
    let opportunities: Opportunity[];
    try {
      opportunities = parseOpportunities(parsedRaw).map((opportunity) => ({
        ...opportunity,
        discovery_source: "ai_assisted" as const,
        verification_status: "unverified" as const,
        source_checked_at: undefined,
        match_reasons: [],
      }));
    } catch {
      throw new GatewayError("invalid_ai_output");
    }

    // Explicit [] is a valid precision-first answer; non-empty garbage is not.
    if (opportunities.length === 0 && rawArray.length > 0) {
      throw new GatewayError("invalid_ai_output");
    }
    return opportunities;
  }
}
