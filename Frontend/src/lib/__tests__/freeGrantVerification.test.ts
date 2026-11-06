import { describe, expect, it } from "vitest";
import { extractFreeGrantEvidence } from "../../../../supabase/functions/_shared/freeGrantVerification.ts";

const NOW = new Date("2026-11-06T12:00:00.000Z");

describe("extractFreeGrantEvidence", () => {
  it("classifies a current open call only when its future deadline and application CTA are present", () => {
    const result = extractFreeGrantEvidence(
      `<!doctype html><html><head><script>Applications are closed.</script></head><body>
        <h1>Green Skills Grant 2027</h1>
        <p>Applications are open until 16 January 2027.</p>
        <a href="/apply">Apply now</a>
      </body></html>`,
      "https://funder.test/programmes/green-skills",
      NOW,
    );

    expect(result.applicationStatus).toBe("open");
    expect(result.applicationUrl).toBe("https://funder.test/apply");
    expect(result.deadlineText).toContain("16 January 2027");
    expect(result.deadlineAt).toBeNull();
    expect(result.deadlineTimezone).toBeNull();
    expect(result.deadlineStatus).toBe("confirmed");
    expect(result.signals.hasFutureDeadline).toBe(true);
    expect(result.visibleText).not.toContain("Applications are closed");
  });

  it("fails closed when an open statement is paired with an expired deadline", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Climate Grant 2025</h1>
       <p>Applications are open until 16 January 2025.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/climate-grant",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.signals.hasFutureDeadline).toBe(false);
    expect(result.uncertainty).toContain("deadline_not_in_future");
  });

  it("does not choose between conflicting current-cycle deadlines", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Research Grant 2027</h1>
       <p>Applications are open.</p>
       <p>Application deadline: 16 January 2027.</p>
       <p>Submission deadline: 17 January 2027.</p>
       <a href="/apply">Submit application</a>`,
      "https://funder.test/research-grant",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.deadlineStatus).toBe("unknown");
    expect(result.deadlineText).toBeNull();
    expect(result.signals.deadlineConflict).toBe(true);
    expect(result.uncertainty).toContain("conflicting_deadlines");
  });

  it("does not mark a source open when current evidence says both open and closed", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Current 2027 Call</h1>
       <p>Applications are open through 16 January 2027.</p>
       <p>Applications are closed for late submissions.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/current-call",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.signals.explicitOpen).toBe(true);
    expect(result.signals.explicitClosed).toBe(true);
    expect(result.uncertainty).toContain("conflicting_status");
  });

  it("ignores an old archive section instead of treating its closed call as current", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Funding opportunities</h1>
       <section id="archive">
         <h2>2025 Grant Archive</h2>
         <p>Applications are closed.</p>
         <a href="/apply-2025">Apply</a>
       </section>`,
      "https://funder.test/funding",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.signals.pageHistorical).toBe(true);
    expect(result.signals.explicitClosed).toBe(false);
    expect(result.applicationUrl).toBeNull();
    expect(result.uncertainty).toContain("historical_or_archived_source");
  });

  it("rejects informational application links that do not provide an application CTA", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Innovation Grant 2027</h1>
       <p>Applications are open until 16 January 2027.</p>
       <a href="/about/applications">Read the application guidelines</a>`,
      "https://funder.test/innovation",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.applicationUrl).toBeNull();
    expect(result.signals.hasApplicationLink).toBe(false);
    expect(result.uncertainty).toContain("application_link_missing");
  });

  it("classifies an explicit rolling call without inventing a deadline", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Community Seed Grants</h1>
       <p>Applications are accepted on a rolling basis throughout the year.</p>
       <a href="/submit">Submit an application</a>`,
      "https://funder.test/seed-grants",
      NOW,
    );

    expect(result.applicationStatus).toBe("rolling");
    expect(result.deadlineText).toBeNull();
    expect(result.deadlineAt).toBeNull();
    expect(result.deadlineStatus).toBe("rolling");
    expect(result.signals.explicitRolling).toBe(true);
  });

  it("fails closed when a rolling statement is paired with conflicting fixed deadlines", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Community Seed Grants 2027</h1>
       <p>Applications are accepted on a rolling basis.</p>
       <p>Application deadline: 16 January 2027.</p>
       <p>Submission deadline: 17 January 2027.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/rolling-conflict",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.signals.explicitRolling).toBe(true);
    expect(result.signals.deadlineConflict).toBe(true);
    expect(result.uncertainty).toContain("conflicting_deadlines");
  });

  it("fails closed when a rolling statement is paired with an expired fixed deadline", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Community Seed Grants 2026</h1>
       <p>Applications are accepted on a rolling basis.</p>
       <p>Current call deadline: 16 January 2026.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/rolling-expired",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.signals.explicitRolling).toBe(true);
    expect(result.signals.hasFutureDeadline).toBe(false);
    expect(result.uncertainty).toContain("deadline_not_in_future");
  });

  it("keeps a current call open when an older archived call on the same page is closed", () => {
    const result = extractFreeGrantEvidence(
      `<h1>Funding opportunities</h1>
       <section class="archive"><h2>2025 archived call</h2>
         <p>Applications are closed.</p>
         <a href="/apply-2025">Apply</a>
       </section>
       <section><h2>2027 current call</h2>
         <p>Applications are open until 16 January 2027.</p>
         <a href="/apply-2027">Apply now</a>
       </section>`,
      "https://funder.test/mixed-calls",
      NOW,
    );

    expect(result.applicationStatus).toBe("open");
    expect(result.applicationUrl).toBe("https://funder.test/apply-2027");
    expect(result.signals.explicitClosed).toBe(false);
    expect(result.signals.pageHistorical).toBe(false);
  });

  it("normalizes an explicitly UTC-timed deadline while leaving other timezones unresolved", () => {
    const utc = extractFreeGrantEvidence(
      `<p>Applications are open. Deadline: 16 January 2027 at 23:59 UTC.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/utc-call",
      NOW,
    );
    const local = extractFreeGrantEvidence(
      `<p>Applications are open. Deadline: 16 January 2027 at 23:59 EST.</p>
       <a href="/apply">Apply now</a>`,
      "https://funder.test/local-call",
      NOW,
    );

    expect(utc.applicationStatus).toBe("open");
    expect(utc.deadlineAt).toBe("2027-01-16T23:59:00.000Z");
    expect(utc.deadlineTimezone).toBe("UTC");
    expect(local.applicationStatus).toBe("open");
    expect(local.deadlineAt).toBeNull();
    expect(local.deadlineTimezone).toBeNull();
  });

  it("rejects an ambiguous numeric day/month deadline instead of guessing the locale", () => {
    const result = extractFreeGrantEvidence(
      `<p>Applications are open. Deadline: 01/02/2027.</p><a href="/apply">Apply now</a>`,
      "https://funder.test/ambiguous-date",
      NOW,
    );

    expect(result.applicationStatus).toBe("unknown");
    expect(result.deadlineText).toBeNull();
    expect(result.deadlineAt).toBeNull();
    expect(result.uncertainty).toContain("deadline_missing");
  });

  it("returns a stable fingerprint for identical source bytes and changes it when the body changes", () => {
    const html = `<p>Applications are open until 16 January 2027.</p><a href="/apply">Apply now</a>`;
    const first = extractFreeGrantEvidence(html, "https://funder.test/fingerprint", NOW);
    const second = extractFreeGrantEvidence(html, "https://funder.test/fingerprint", NOW);
    const changed = extractFreeGrantEvidence(`${html}<!-- changed -->`, "https://funder.test/fingerprint", NOW);

    expect(first.contentFingerprint).toBe(second.contentFingerprint);
    expect(changed.contentFingerprint).not.toBe(first.contentFingerprint);
  });

  it("preserves malformed numeric entities without throwing during extraction", () => {
    const result = extractFreeGrantEvidence(
      `<p>Applications are open until 16 January 2027. &#x110000;</p><a href="/apply">Apply now</a>`,
      "https://funder.test/malformed-entity",
      NOW,
    );

    expect(result.applicationStatus).toBe("open");
    expect(result.visibleText).toContain("&#x110000;");
  });
  it("reads call content after a large script without truncating the evidence", () => {
    const html = `<script>${"x".repeat(180_000)}</script><h1>Grant 2027</h1><p>Applications are open until 16 January 2027.</p><a href="/apply">Apply now</a>`;
    expect(extractFreeGrantEvidence(html, "https://funder.test/grant", NOW).applicationStatus).toBe("open");
  });
  it("does not promote a truncated prefix that could omit a later closure notice", () => {
    const html = `<p>Applications are open until 16 January 2027.</p><a href="/apply">Apply now</a>${"x".repeat(1_000_001)}<p>Applications are closed.</p>`;
    const result = extractFreeGrantEvidence(html, "https://funder.test/grant", NOW);
    expect(result.applicationStatus).toBe("unknown");
    expect(result.uncertainty).toContain("source_truncated");
  });

  it("keeps deadline evidence anchored to its label after a long page introduction", () => {
    const html = `<h1>Grant 2027</h1><p>${"Background information. ".repeat(50)}</p><p>Applications are open.</p><p>Deadline: 16 January 2027.</p><a href="/apply">Apply now</a>`;
    const result = extractFreeGrantEvidence(html, "https://funder.test/grant", NOW);
    expect(result.applicationStatus).toBe("open");
    expect(result.deadlineText).toBe("Deadline: 16 January 2027");
  });

  it("preserves dotted GMT closing times and leaves midnight boundaries unresolved", () => {
    const dotted = extractFreeGrantEvidence(`<p>Applications are open. Deadline: 16 January 2027 at 11.59 pm GMT.</p><a href="/apply">Apply now</a>`, "https://funder.test/grant", NOW);
    expect(dotted.deadlineAt).toBe("2027-01-16T23:59:00.000Z");
    expect(dotted.deadlineText).toContain("11.59 pm GMT");
    const midnight = extractFreeGrantEvidence(`<p>Applications are open. Deadline: 16 January 2027 at midnight UTC.</p><a href="/apply">Apply now</a>`, "https://funder.test/grant", NOW);
    expect(midnight.deadlineAt).toBeNull();
  });

  it("does not mark a future opening window open just because its deadline is later", () => {
    const result = extractFreeGrantEvidence(`<h1>Grant 2027</h1><p>Applications open on 15 December 2026.</p><p>Deadline: 16 January 2027.</p><a href="/apply">Apply now</a>`, "https://funder.test/grant", NOW);
    expect(result.applicationStatus).toBe("unknown");
    expect(result.uncertainty).toContain("opening_date_in_future");
  });

});
