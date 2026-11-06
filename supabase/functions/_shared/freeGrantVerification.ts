/**
 * Deterministic, network-free extraction for free official-source checks.
 *
 * This module deliberately does not decide whether a source is trustworthy and
 * does not make a canonical database update. Callers must verify the source URL
 * against the active source registry and compare contentFingerprint with their
 * saved snapshot before revalidating a previously supported status.
 */

export type FreeApplicationStatus = "open" | "rolling" | "closed" | "paused" | "unknown";
export type FreeDeadlineStatus = "confirmed" | "rolling" | "unknown";

export interface FreeGrantSignals {
  explicitOpen: boolean;
  explicitRolling: boolean;
  explicitClosed: boolean;
  explicitPaused: boolean;
  hasApplicationLink: boolean;
  hasFutureDeadline: boolean;
  deadlineConflict: boolean;
  pageHistorical: boolean;
  statusEvidence: string[];
  deadlineCandidates: string[];
}

export interface FreeGrantEvidence {
  sourceUrl: string | null;
  contentFingerprint: string;
  visibleText: string;
  links: string[];
  applicationStatus: FreeApplicationStatus;
  deadlineText: string | null;
  deadlineAt: string | null;
  deadlineTimezone: string | null;
  deadlineStatus: FreeDeadlineStatus;
  applicationUrl: string | null;
  signals: FreeGrantSignals;
  uncertainty: string[];
  error?: "invalid_source_url" | "empty_source";
}

type StatusKind = "open" | "rolling" | "closed" | "paused";
type LinkKind = "anchor" | "form" | "schema" | "source";

interface LinkRecord {
  url: string;
  text: string;
  kind: LinkKind;
  context?: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  minutes: number | null;
  timezone: string | null;
  hasExplicitTime: boolean;
}

interface DeadlineCandidate {
  text: string;
  dateKey: string;
  dateParts: DateParts;
  deadlineAt: string | null;
  context: string;
}

interface StatusHit {
  kind: StatusKind;
  text: string;
  context: string;
}

interface SchemaEvidence {
  links: LinkRecord[];
  deadlines: DeadlineCandidate[];
  statusHits: StatusHit[];
}

const MAX_VISIBLE_TEXT = 200_000;
const MAX_RAW_HTML = 1_000_000;
const MAX_FINGERPRINT_INPUT = 120_000;
const MAX_SCHEMA_SCRIPT = 100_000;
const MAX_LINKS = 100;
const MAX_APPLICATION_CANDIDATES = 20;
const MAX_EVIDENCE_TEXT = 260;
const CURRENT_YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Extract current-cycle evidence from already-fetched HTML.
 *
 * `now` is injected so scheduled workers and tests make the same date decision.
 * The function never fetches, calls a model, or claims that a source is trusted.
 */
export function extractFreeGrantEvidence(
  rawHTML: string,
  sourceURL: string,
  now = new Date(),
): FreeGrantEvidence {
  const raw = typeof rawHTML === "string" ? rawHTML : "";
  const sourceUrl = normalizeHttpUrl(sourceURL);
  const fingerprintInput = raw.length > MAX_FINGERPRINT_INPUT
    ? `${raw.slice(0, MAX_FINGERPRINT_INPUT)}\u0000${raw.length}`
    : raw;
  const contentFingerprint = fingerprint(fingerprintInput);
  const boundedRaw = raw.slice(0, MAX_RAW_HTML);
  const fullVisibleText = extractVisibleText(boundedRaw);
  const visibleText = fullVisibleText.slice(0, MAX_VISIBLE_TEXT);
  const emptyResult = createBaseEvidence(sourceUrl, contentFingerprint, visibleText);

  if (!sourceUrl) {
    return {
      ...emptyResult,
      uncertainty: ["invalid_source_url"],
      error: "invalid_source_url",
    };
  }
  if (!raw.trim() || !visibleText) {
    return {
      ...emptyResult,
      uncertainty: ["empty_source"],
      error: "empty_source",
    };
  }

  const sourceTruncated = raw.length > MAX_RAW_HTML || fullVisibleText.length > MAX_VISIBLE_TEXT;
  const cleanMarkup = removeNonVisibleMarkup(boundedRaw);
  const anchorLinks = extractMarkupLinks(cleanMarkup, sourceUrl);
  const schema = extractSchemaEvidence(boundedRaw, sourceUrl, now);
  const allLinkRecords = dedupeLinks([
    { url: sourceUrl, text: "", kind: "source" },
    ...anchorLinks,
    ...schema.links,
  ]);
  const links = allLinkRecords.map((link) => link.url).slice(0, MAX_LINKS);

  const pageHeadingText = extractHeadings(boundedRaw);
  const textDeadlines = extractDeadlineCandidates(visibleText, now);
  const allDeadlines = dedupeDeadlines([...textDeadlines, ...schema.deadlines]);
  const relevantDeadlines = allDeadlines.filter((candidate) => !isHistoricalContext(candidate.context, now));
  const textStatusHits = extractStatusHits(visibleText, now);
  const statusHits = dedupeStatusHits([...textStatusHits, ...schema.statusHits]);
  const relevantStatusHits = statusHits.filter((hit) => !isHistoricalContext(hit.context, now));

  const pageHistorical = isHistoricalPage(pageHeadingText, visibleText, relevantStatusHits, relevantDeadlines, now);
  const uncertainty: string[] = sourceTruncated ? ["source_truncated"] : [];
  const statusEvidence = uniqueStrings(relevantStatusHits.map((hit) => hit.text)).slice(0, 8);
  const deadlineEvidence = uniqueStrings(relevantDeadlines.map((candidate) => candidate.text)).slice(0, 8);

  const deadlineSignatures = uniqueStrings(relevantDeadlines.map(deadlineSignature));
  const deadlineConflict = deadlineSignatures.length > 1;
  if (deadlineConflict) uncertainty.push("conflicting_deadlines");

  const selectedDeadline = deadlineSignatures.length === 1 ? relevantDeadlines[0] ?? null : null;
  const explicitOpen = relevantStatusHits.some((hit) => hit.kind === "open");
  const explicitRolling = relevantStatusHits.some((hit) => hit.kind === "rolling");
  const explicitClosed = relevantStatusHits.some((hit) => hit.kind === "closed");
  const explicitPaused = relevantStatusHits.some((hit) => hit.kind === "paused");

  const applicationCandidates = rankApplicationLinks(allLinkRecords, now, `${pageHeadingText.join("\n")}\n${visibleText}`);
  const pageIsHistorical = pageHistorical && !hasCurrentEvidence(relevantStatusHits, relevantDeadlines, now);
  const applicationUrl = pageIsHistorical ? null : applicationCandidates[0]?.url ?? null;
  const hasApplicationLink = Boolean(applicationUrl);
  const hasFutureDeadline = Boolean(selectedDeadline && isFutureDeadline(selectedDeadline.dateParts, now));
  const statusConflict = hasStatusConflict({ explicitOpen, explicitRolling, explicitClosed, explicitPaused });

  if (pageIsHistorical) uncertainty.push("historical_or_archived_source");
  if (statusConflict) uncertainty.push("conflicting_status");
  if (!hasApplicationLink && (explicitOpen || explicitRolling)) uncertainty.push("application_link_missing");
  if (allDeadlines.length > 0 && !deadlineConflict && !hasFutureDeadline) {
    uncertainty.push("deadline_not_in_future");
  }
  if (explicitOpen && !selectedDeadline && !explicitRolling) uncertainty.push("deadline_missing");

  const futureOpening = findDateMatches(visibleText).some((match) => {
    const before = visibleText.slice(Math.max(0, match.index - 100), match.index);
    const parsed = parseDateValue(match.raw);
    return /\b(?:applications?|submissions?|calls?)\s+(?:will\s+)?(?:open|opens|begin|begins|start|starts)\s+(?:(?:on|from)\s+)?$/i.test(before)
      && Boolean(parsed && isFutureDeadline(parsed.parts, now));
  });
  if (futureOpening) uncertainty.push("opening_date_in_future");

  let applicationStatus: FreeApplicationStatus = "unknown";
  if (!futureOpening && !sourceTruncated && !pageIsHistorical && !statusConflict) {
    if (explicitPaused) {
      applicationStatus = "paused";
    } else if (explicitClosed) {
      applicationStatus = "closed";
    } else if (explicitRolling) {
      applicationStatus = hasApplicationLink && !deadlineConflict && (!selectedDeadline || hasFutureDeadline)
        ? "rolling"
        : "unknown";
    } else if (explicitOpen) {
      applicationStatus = hasApplicationLink && !deadlineConflict && hasFutureDeadline ? "open" : "unknown";
    }
  }

  if (applicationStatus === "unknown" && !uncertainty.length) uncertainty.push("insufficient_current_cycle_evidence");

  const deadlineAt = selectedDeadline?.deadlineAt ?? null;
  const deadlineTimezone = selectedDeadline?.dateParts.timezone ?? null;
  const deadlineText = selectedDeadline?.text ?? null;
  const deadlineStatus: FreeDeadlineStatus = explicitRolling && !selectedDeadline
    ? "rolling"
    : selectedDeadline && !deadlineConflict
      ? "confirmed"
      : "unknown";

  return {
    sourceUrl,
    contentFingerprint,
    visibleText,
    links,
    applicationStatus,
    deadlineText,
    deadlineAt,
    deadlineTimezone,
    deadlineStatus,
    applicationUrl,
    signals: {
      explicitOpen,
      explicitRolling,
      explicitClosed,
      explicitPaused,
      hasApplicationLink,
      hasFutureDeadline,
      deadlineConflict,
      pageHistorical: pageIsHistorical,
      statusEvidence,
      deadlineCandidates: deadlineEvidence,
    },
    uncertainty: uniqueStrings(uncertainty),
  };
}

function createBaseEvidence(
  sourceUrl: string | null,
  contentFingerprint: string,
  visibleText: string,
): FreeGrantEvidence {
  return {
    sourceUrl,
    contentFingerprint,
    visibleText,
    links: sourceUrl ? [sourceUrl] : [],
    applicationStatus: "unknown",
    deadlineText: null,
    deadlineAt: null,
    deadlineTimezone: null,
    deadlineStatus: "unknown",
    applicationUrl: null,
    signals: {
      explicitOpen: false,
      explicitRolling: false,
      explicitClosed: false,
      explicitPaused: false,
      hasApplicationLink: false,
      hasFutureDeadline: false,
      deadlineConflict: false,
      pageHistorical: false,
      statusEvidence: [],
      deadlineCandidates: [],
    },
    uncertainty: [],
  };
}

function removeNonVisibleMarkup(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|head|svg|canvas|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
}

function extractVisibleText(raw: string): string {
  const text = removeNonVisibleMarkup(raw)
    .replace(/<(?:br|\/p|\/h[1-6]|\/li|\/section|\/div)\s*\/?>/gi, "\n")
    .replace(/<(?:p|h[1-6]|li|section|div)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(text)
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function extractHeadings(raw: string): string[] {
  const headings: string[] = [];
  const pattern = /<(?:title|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:title|h[1-6])\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null && headings.length < 50) {
    const text = decodeEntities(stripTags(match[1])).replace(/\s+/g, " ").trim();
    if (text) headings.push(text);
  }
  return headings;
}

function extractMarkupLinks(markup: string, sourceUrl: string): LinkRecord[] {
  const records: LinkRecord[] = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(markup)) !== null && records.length < MAX_LINKS) {
    const href = attributeValue(match[1], "href");
    const url = href ? normalizeHttpUrl(href, sourceUrl) : null;
    if (!url) continue;
    records.push({
      url,
      text: decodeEntities(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      kind: "anchor",
      context: decodeEntities(stripTags(markup.slice(Math.max(0, match.index - 100), Math.min(markup.length, match.index + match[0].length + 100))))
        .replace(/\s+/g, " ")
        .trim(),
    });
  }

  const formPattern = /<form\b([^>]*)>/gi;
  while ((match = formPattern.exec(markup)) !== null && records.length < MAX_LINKS) {
    const action = attributeValue(match[1], "action");
    const url = action ? normalizeHttpUrl(action, sourceUrl) : null;
    if (url) {
      records.push({
        url,
        text: "form application action",
        kind: "form",
        context: decodeEntities(stripTags(markup.slice(Math.max(0, match.index - 100), Math.min(markup.length, match.index + match[0].length + 100))))
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
  }
  return records;
}

function attributeValue(attributes: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = pattern.exec(attributes);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function extractSchemaEvidence(raw: string, sourceUrl: string, now: Date): SchemaEvidence {
  const links: LinkRecord[] = [];
  const deadlines: DeadlineCandidate[] = [];
  const statusHits: StatusHit[] = [];
  const scriptPattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(raw)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].slice(0, MAX_SCHEMA_SCRIPT).trim());
    } catch {
      continue;
    }
    for (const node of walkSchemaNodes(parsed)) {
      if (!isGrantSchemaNode(node)) continue;
      const applicationValue = firstString(node, ["applicationUrl", "application_url", "applyUrl", "apply_url", "applicationLink"]);
      if (applicationValue) {
        const url = normalizeHttpUrl(applicationValue, sourceUrl);
        if (url) links.push({ url, text: "schema application URL", kind: "schema" });
      }

      const schemaStatus = firstString(node, ["applicationStatus", "application_status", "status", "availability"]);
      if (schemaStatus) {
        const kind = statusKindFromText(schemaStatus);
        if (kind) statusHits.push({ kind, text: schemaStatus.slice(0, MAX_EVIDENCE_TEXT), context: schemaStatus });
      }

      const deadlineValue = firstString(node, ["applicationDeadline", "application_deadline", "applicationEndDate", "deadline", "validThrough"]);
      if (deadlineValue) {
        const candidate = parseSchemaDeadline(deadlineValue, now);
        if (candidate) deadlines.push(candidate);
      }
    }
  }
  return { links, deadlines, statusHits };
}

function walkSchemaNodes(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5 || value === null || value === undefined) return [];
  const result: Record<string, unknown>[] = [];
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth }];
  while (stack.length && result.length < 100) {
    const current = stack.pop();
    if (!current || current.depth > 5 || current.value === null || current.value === undefined) continue;
    if (Array.isArray(current.value)) {
      const items = current.value.slice(0, 50);
      for (let index = items.length - 1; index >= 0; index -= 1) {
        stack.push({ value: items[index], depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof current.value !== "object") continue;
    const record = current.value as Record<string, unknown>;
    result.push(record);
    const values = Object.values(record).slice(0, 50);
    for (let index = values.length - 1; index >= 0; index -= 1) {
      stack.push({ value: values[index], depth: current.depth + 1 });
    }
  }
  return result;
}

function isGrantSchemaNode(node: Record<string, unknown>): boolean {
  const type = firstString(node, ["@type", "type"])?.toLowerCase() ?? "";
  return /grant|funding|opportunity/.test(type)
    || ["applicationUrl", "application_url", "applicationDeadline", "application_deadline"].some((key) => key in node);
}

function firstString(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const item = value.find((entry) => typeof entry === "string" && entry.trim());
      if (typeof item === "string") return item.trim();
    }
  }
  return null;
}

function parseSchemaDeadline(value: string, now: Date): DeadlineCandidate | null {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  const dateParts = parsed.parts;
  const text = `Application deadline: ${value}`.slice(0, MAX_EVIDENCE_TEXT);
  return {
    text,
    dateKey: dateKey(dateParts),
    dateParts,
    deadlineAt: toDeadlineAt(dateParts),
    context: text,
  };
}

function extractStatusHits(text: string, now: Date): StatusHit[] {
  const hits: StatusHit[] = [];
  const patterns: Array<[StatusKind, RegExp]> = [
    ["open", /\b(?:applications?|submissions?|registrations?|calls?|portals?)\b[^.!?\n]{0,80}\b(?:are|is|remain(?:s)?|now|currently)?\s*(?:open|accepting|available)\b|\bopen\s+call\b/gi],
    ["rolling", /\b(?:rolling\s+basis|rolling\s+applications?|no\s+deadlines?|any\s+time(?:\s+of\s+year)?|year[-\s]?round|throughout\s+the\s+year|accepting\s+applications?\s+at\s+any\s+time)\b/gi],
    ["closed", /\b(?:applications?|submissions?|registrations?|calls?|portals?)\b[^.!?\n]{0,80}\b(?:are|is|now|currently|have)?\s*(?:closed|ended|over|no\s+longer\s+accepting)\b|\b(?:deadline|application\s+window)\s+(?:has\s+)?passed\b|\bclosed\s+call\b/gi],
    ["paused", /\b(?:applications?|submissions?|registrations?|calls?|portals?)\b[^.!?\n]{0,80}\b(?:are|is|now|currently)?\s*(?:paused|on\s+hold|temporarily\s+closed|unavailable)\b/gi],
  ];
  for (const [kind, pattern] of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const context = contextWindow(text, match.index, match[0].length);
      if (isHistoricalContext(context, now)) continue;
      hits.push({ kind, text: compactEvidence(match[0]), context });
    }
  }
  return hits;
}

function extractDeadlineCandidates(text: string, now: Date): DeadlineCandidate[] {
  const candidates: DeadlineCandidate[] = [];
  for (const match of findDateMatches(text)) {
    const before = text.slice(Math.max(0, match.index - 160), match.index);
    const label = findDeadlineLabel(before);
    if (!label) continue;
    const suffix = temporalSuffix(text.slice(match.end, Math.min(text.length, match.end + 80)));
    const parsed = parseDateValue(`${match.raw}${suffix}`);
    if (!parsed) continue;
    const labelIndex = Math.max(0, match.index - 160) + label.index;
    const context = contextWindow(text, labelIndex, (match.end + suffix.length) - labelIndex);
    candidates.push({
      text: compactEvidence(text.slice(labelIndex, Math.min(text.length, match.end + suffix.length))),
      dateKey: dateKey(parsed.parts),
      dateParts: parsed.parts,
      deadlineAt: toDeadlineAt(parsed.parts),
      context,
    });
  }
  return candidates;
}

interface DateMatch {
  raw: string;
  index: number;
  end: number;
}

function findDateMatches(text: string): DateMatch[] {
  const patterns = [
    /\b(?:19|20)\d{2}-\d{1,2}-\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*,?\s*(?:19|20)\d{2}\b/gi,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*(?:19|20)\d{2}\b/gi,
    /\b\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d{2}\b/g,
  ];
  const matches: DateMatch[] = [];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({ raw: match[0], index: match.index, end: match.index + match[0].length });
    }
  }
  return matches.sort((left, right) => left.index - right.index || left.raw.length - right.raw.length);
}

function findDeadlineLabel(before: string): { index: number; text: string } | null {
  const labelPattern = /(?:application|submission|proposal|grant|call)?\s*(?:deadline|closing\s+date|closing|closes?|due\s+date|apply\s+by|applications?\s+(?:close|closes|end|ends)|submissions?\s+(?:close|closes|end|ends)|(?:open|opened)\s+(?:until|through)|valid\s+through)\b/gi;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = labelPattern.exec(before)) !== null) last = match;
  if (!last) return null;
  const index = last.index;
  return { index, text: last[0] };
}

function temporalSuffix(afterDate: string): string {
  const match = /^(?:\s*(?:at|by|before|until)?\s*(?:(?:\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)|(?:midnight|noon))\s*(?:(?:in|at|\()\s*)?(?:UTC|GMT(?:\s*[+-]\s*\d{1,2})?|EST|EDT|ET|CET|CEST|PT|PST|PDT|IDLW|Z)?\s*\)?)/i.exec(afterDate);
  return match?.[0] ?? "";
}

function parseDateValue(value: string): { parts: DateParts } | null {
  const text = value.trim();
  let year: number;
  let month: number;
  let day: number;
  let minutes: number | null = null;
  let timezone: string | null = null;
  let hasExplicitTime = false;

  const iso = /^(?:.*?)(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s+)?(\d{1,2}:\d{2}(?::\d{2})?)?\s*(Z|UTC|GMT(?:\s*[+-]\s*\d{1,2})?|[+-]\d{2}:?\d{2})?\b/i.exec(text);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
    if (iso[4]) {
      const parsedTime = parseClock(iso[4]);
      minutes = parsedTime;
      hasExplicitTime = parsedTime !== null;
    }
    timezone = normalizeKnownTimezone(iso[5]);
    if (!validCalendarDate(year, month, day)) return null;
    return { parts: { year, month, day, minutes, timezone, hasExplicitTime } };
  }

  const dmy = /^(?:.*?)(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s*((?:19|20)\d{2})/i.exec(text);
  const mdy = /^(?:.*?)([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*((?:19|20)\d{2})/i.exec(text);
  const numeric = /^(?:.*?)(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})/.exec(text);
  if (dmy && MONTHS[dmy[2].toLowerCase()]) {
    day = Number(dmy[1]);
    month = MONTHS[dmy[2].toLowerCase()];
    year = Number(dmy[3]);
  } else if (mdy && MONTHS[mdy[1].toLowerCase()]) {
    month = MONTHS[mdy[1].toLowerCase()];
    day = Number(mdy[2]);
    year = Number(mdy[3]);
  } else if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    if (first <= 12 && second <= 12) return null;
    if (first > 12) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
    year = Number(numeric[3]);
  } else {
    return null;
  }

  const dateEnd = dmy?.[0].length ?? mdy?.[0].length ?? numeric?.[0].length ?? 0;
  const suffix = text.slice(dateEnd);
  const clockMatch = /(?:^|\s)(\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?|midnight|noon)\b/i.exec(suffix);
  if (clockMatch) {
    minutes = parseClock(clockMatch[1]);
    hasExplicitTime = minutes !== null;
  }
  timezone = normalizeKnownTimezone(/\b(UTC|GMT(?:\s*[+-]\s*\d{1,2})?|EST|EDT|ET|CET|CEST|PT|PST|PDT|IDLW)\b/i.exec(suffix)?.[1]);
  if (!validCalendarDate(year, month, day)) return null;
  return { parts: { year, month, day, minutes, timezone, hasExplicitTime } };
}

function parseClock(raw: string): number | null {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (value === "midnight") return null;
  if (value === "noon") return 12 * 60;
  const match = /^(\d{1,2})(?:[:.](\d{2}))?(a\.?m\.?|p\.?m\.?)?$/.exec(value);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (minutes > 59) return null;
  const meridiem = match[3]?.replace(/\./g, "");
  if (meridiem === "am" && hours === 12) hours = 0;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

function normalizeKnownTimezone(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.toUpperCase().replace(/\s+/g, "");
  if (value === "Z" || value === "UTC" || value === "UTC+0" || value === "UTC+00" || value === "UTC+00:00") return "UTC";
  if (value === "GMT" || value === "GMT+0" || value === "GMT+00" || value === "GMT+00:00") return "GMT";
  return null;
}

function toDeadlineAt(parts: DateParts): string | null {
  if (!parts.hasExplicitTime || parts.minutes === null || !parts.timezone) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, Math.floor(parts.minutes / 60), parts.minutes % 60));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusKindFromText(text: string): StatusKind | null {
  const lower = text.toLowerCase();
  if (/rolling|year[-\s]?round|any\s+time|no\s+deadline/.test(lower)) return "rolling";
  if (/paused|on\s+hold|temporarily\s+closed|unavailable/.test(lower)) return "paused";
  if (/closed|ended|over|passed/.test(lower)) return "closed";
  if (/open|accepting|available/.test(lower)) return "open";
  return null;
}

function rankApplicationLinks(records: LinkRecord[], now: Date, pageText = ""): LinkRecord[] {
  const ranked = records.map((record, index) => ({ record, index, score: applicationScore(record) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, MAX_APPLICATION_CANDIDATES);
  const currentYear = now.getUTCFullYear();
  const pageHasCurrentOrFutureYear = extractYears(pageText).some((year) => year >= currentYear);
  const current = ranked.filter((candidate) => {
    if (candidate.record.context && isHistoricalContext(candidate.record.context, now)) return false;
    if (pageHasCurrentOrFutureYear) {
      const linkYears = extractYears(candidate.record.url);
      if (linkYears.length > 0 && linkYears.every((year) => year < currentYear)) return false;
    }
    return true;
  });
  return (current.length ? current : ranked).map((candidate) => candidate.record);
}

function applicationScore(record: LinkRecord): number {
  const text = record.text.toLowerCase();
  const url = record.url.toLowerCase();
  const path = (() => {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  })();
  const strongCta = /\b(?:apply|submit|register|start)\b/.test(text)
    && !/\b(?:guidelines?|guidance|instructions?|criteria|faq|about|learn|details?|eligib|contact|read)\b/.test(text);
  const portalText = /\b(?:application\s+portal|apply\s+online|submission\s+form|application\s+form|grant\s+portal)\b/.test(text);
  const pathCue = /(?:^|[\/_?.#-])(?:apply|application|submit|submission|register|portal)(?:[\/_?.#-]|$)/.test(path);
  const knownApplicationHost = /(?:submittable\.com|grantplatform|forms\.google\.com|docs\.google\.com\/forms|forms\.office\.com|airtable\.com)/.test(url);
  const informational = /\b(?:guidelines?|guidance|instructions?|criteria|faq|about|learn|details?|eligib|contact|read\s+more)\b/.test(text);
  if (informational && !strongCta && !portalText) return 0;
  let score = 0;
  if (strongCta) score += 7;
  if (portalText) score += 6;
  if (pathCue) score += 4;
  if (knownApplicationHost) score += 4;
  if (record.kind === "schema") score += 2;
  return score;
}

function dedupeLinks(records: LinkRecord[]): LinkRecord[] {
  const seen = new Set<string>();
  const result: LinkRecord[] = [];
  for (const record of records) {
    if (seen.has(record.url)) continue;
    seen.add(record.url);
    result.push(record);
    if (result.length >= MAX_LINKS) break;
  }
  return result;
}

function dedupeDeadlines(candidates: DeadlineCandidate[]): DeadlineCandidate[] {
  const seen = new Set<string>();
  const result: DeadlineCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.text}|${deadlineSignature(candidate)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function dedupeStatusHits(hits: StatusHit[]): StatusHit[] {
  const seen = new Set<string>();
  const result: StatusHit[] = [];
  for (const hit of hits) {
    const key = `${hit.kind}|${hit.text}|${hit.context}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(hit);
  }
  return result;
}

function deadlineSignature(candidate: DeadlineCandidate): string {
  const parts = candidate.dateParts;
  return `${candidate.dateKey}|${parts.minutes === null ? "date-only" : parts.minutes}|${parts.timezone ?? "unknown-zone"}`;
}

function isFutureDeadline(parts: DateParts, now: Date): boolean {
  const candidateDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (candidateDay > nowDay) return true;
  if (candidateDay < nowDay || parts.minutes === null || !parts.timezone) return false;
  const exact = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, Math.floor(parts.minutes / 60), parts.minutes % 60));
  return exact.getTime() > now.getTime();
}

function hasStatusConflict(signals: Pick<FreeGrantSignals, "explicitOpen" | "explicitRolling" | "explicitClosed" | "explicitPaused">): boolean {
  return (
    (signals.explicitOpen && signals.explicitClosed) ||
    (signals.explicitOpen && signals.explicitPaused) ||
    (signals.explicitRolling && signals.explicitClosed) ||
    (signals.explicitRolling && signals.explicitPaused) ||
    (signals.explicitClosed && signals.explicitPaused)
  );
}

function hasCurrentEvidence(statusHits: StatusHit[], deadlines: DeadlineCandidate[], now: Date): boolean {
  return statusHits.length > 0 || deadlines.some((candidate) => isFutureDeadline(candidate.dateParts, now));
}

function isHistoricalPage(
  headings: string[],
  visibleText: string,
  statusHits: StatusHit[],
  deadlines: DeadlineCandidate[],
  now: Date,
): boolean {
  const headingText = headings.join(" ");
  const archiveMarker = /\b(?:archive|archived|past\s+(?:calls?|grants?|opportunities?)|previous\s+(?:calls?|grants?|opportunities?)|closed\s+(?:calls?|grants?))\b/i.test(`${headingText} ${visibleText.slice(0, 2_000)}`);
  const headingYears = extractYears(headingText);
  const hasOldYearHeading = headingYears.length > 0 && headingYears.every((year) => year < now.getUTCFullYear());
  const hasCurrentEvidence = hasCurrentEvidenceFromSignals(statusHits, deadlines, now);
  return (archiveMarker || hasOldYearHeading) && !hasCurrentEvidence;
}

function hasCurrentEvidenceFromSignals(statusHits: StatusHit[], deadlines: DeadlineCandidate[], now: Date): boolean {
  return statusHits.length > 0 || deadlines.some((candidate) => {
    const years = extractYears(candidate.context);
    return years.some((year) => year >= now.getUTCFullYear()) || isFutureDeadline(candidate.dateParts, now);
  });
}

function isHistoricalContext(context: string, now: Date): boolean {
  const lower = context.toLowerCase();
  if (/\b(?:archive|archived|past\s+(?:calls?|grants?|opportunities?)|previous\s+(?:calls?|grants?|opportunities?)|last\s+year|closed\s+(?:calls?|grants?))\b/.test(lower)) {
    const years = extractYears(context);
    if (!years.length || years.every((year) => year < now.getUTCFullYear())) return true;
  }
  const years = extractYears(context);
  return years.length > 0 && years.every((year) => year < now.getUTCFullYear());
}

function contextWindow(text: string, index: number, length: number): string {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  let previousLineStart = lineStart;
  for (let line = 0; line < 4 && previousLineStart > 0; line += 1) {
    previousLineStart = text.lastIndexOf("\n", previousLineStart - 2) + 1;
  }
  const lineEndIndex = text.indexOf("\n", index + length);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const start = previousLineStart > 0 ? previousLineStart : Math.max(0, index - 120);
  const end = lineEnd > index ? lineEnd : Math.min(text.length, index + length + 120);
  return text.slice(start, end).slice(0, MAX_EVIDENCE_TEXT);
}

function compactEvidence(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim().slice(0, MAX_EVIDENCE_TEXT);
}

function extractYears(text: string): number[] {
  const years: number[] = [];
  let match: RegExpExecArray | null;
  CURRENT_YEAR_RE.lastIndex = 0;
  while ((match = CURRENT_YEAR_RE.exec(text)) !== null) years.push(Number(match[0]));
  return years;
}

function dateKey(parts: DateParts): string {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeHttpUrl(raw: string, base?: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim(), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, " ");
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    ndash: "–",
    mdash: "—",
  };
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (full, value: string) => {
    const lower = value.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return safeCodePoint(code, full);
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return safeCodePoint(code, full);
    }
    return named[lower] ?? full;
  });
}

function safeCodePoint(code: number, original: string): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return original;
  }
  return String.fromCodePoint(code);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function fingerprint(value: string): string {
  let hash = 14695981039346656037n;
  const prime = 1099511628211n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64-${hash.toString(16).padStart(16, "0")}-${value.length}`;
}
