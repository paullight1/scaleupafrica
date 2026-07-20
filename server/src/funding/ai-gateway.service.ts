import { Injectable, Inject, Logger } from "@nestjs/common";
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

/**
 * Ports the aggregate-funding edge function's model call: same system/user prompts
 * (verbatim), env-driven url/key/model. Validates + sanitizes output through the
 * shared OpportunitySchema — never returns or persists raw model output.
 */
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
          max_tokens: 16000,
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
      opportunities = parseOpportunities(parsedRaw);
    } catch {
      throw new GatewayError("invalid_ai_output");
    }
    // A non-empty model response yielding zero valid items is a bad response.
    if (opportunities.length === 0 && rawArray.length > 0) throw new GatewayError("invalid_ai_output");
    return opportunities;
  }
}

const SYSTEM_PROMPT = `You are a funding intelligence analyst for African SMEs. Return ONLY valid JSON matching the schema.

CRITICAL RULES:
- Curate 15-25 REAL, verifiable funding opportunities (grants, competitions, accelerators, incubators, pitch events, development finance, scholarships, and FELLOWSHIPS with travel/exchange opportunities) accessible to African SMEs, founders, and young leaders.
- NEVER invent fictional funders, programs, URLs, or founder examples. If you are not confident a program exists and is genuine, DO NOT include it.
- Cast a WIDE net across credible funders and programs. Consider (non-exhaustive): Tony Elumelu Foundation, African Development Bank, GIZ, USADF, AECF, World Bank, IFC, Mastercard Foundation (incl. EleV, Africa Growth Fund), Google for Startups Africa / Black Founders Fund, Mandela Washington Fellowship (YALI), Obama Foundation Leaders Africa, Chevening, Commonwealth Scholarships, Acumen Fellowship, Anzisha Prize, Jack Ma Foundation Africa Netpreneur Prize, Ashoka, Echoing Green, Cartier Women's Initiative, One Young World, Orange Corners (Netherlands MFA), Westerwelle Young Founders Programme, Seedstars, MEST Africa, Founders Factory Africa, Norrsken Impact Accelerator, Village Capital, Injini, GreenTec Capital, Katapult Africa, FATE Foundation, LEAP Africa, She Leads Africa / SLA, Rising Tide Africa, AWIEF, Africa Enterprise Challenge Fund, DOEN Foundation, Segal Family Foundation, Draper Richards Kaplan, Skoll, Schwab Foundation, WEF Global Shapers, Commonwealth Youth Awards, UNLEASH, Global Citizen Year, MIT Solve, Hult Prize, Milken-Motsepe Prize, Africa's Business Heroes (Jack Ma), Total Startupper, Standard Bank / MTN / Access Bank programs, Shell LiveWIRE, IBM Sustainability Accelerator, Bloomberg Philanthropies, Rockefeller, Ford Foundation, Bill & Melinda Gates Foundation, DFC, FMO, Proparco, British International Investment, EU Delegation SME facilities, AfCFTA-related programs, and similar credible funders.
- Include at least 3-5 FELLOWSHIP opportunities that offer travel, exchange, or residency components.
- For each opportunity provide RICH detail so the founder can decide before visiting the funder site.
- Prioritize breadth and diversity of funder types and geographies over repeating the same 2-3 funders.`;

function userPrompt(keywords: string): string {
  return `Keywords: "${keywords}"

Return a JSON object with an "opportunities" array. Each item MUST have:
{
  "title": string,
  "funder": string,
  "type": "Grant" | "Competition" | "Accelerator" | "Incubator" | "Fellowship" | "Scholarship" | "Pitch Event" | "Development Finance",
  "summary": string (2 sentences overview),
  "amount": string (e.g. "Up to $50,000" or "" if unknown),
  "opens": string (when applications open),
  "deadline": string (APPLICATION DEADLINE — the last day to apply. Required. If unknown for the current cycle, give the typical closing month.),
  "eligibility": string (short),
  "url": string (funder homepage or program URL — must be a real https domain),
  "tags": string[] (2-4 short tags),
  "funder_about": string (2-3 sentences about the funding organization),
  "sdg_focus": string[] (relevant UN SDGs),
  "past_recipients": [ { "business_name": string, "founder_name": string, "website": string (or ""), "note": string } ] (2-4 examples if genuinely known, otherwise empty array — do NOT fabricate),
  "application_tips": string[] (3-5 concrete tips),
  "travel_component": string (describe travel/exchange/residency if fellowship, otherwise ""),
  "important_notes": string (caveats or things to know)
}

Return AT LEAST 15 opportunities spanning different funder types. If you cannot recall genuine past recipients, return an empty array for past_recipients — never invent names.`;
}
