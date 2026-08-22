# Cresciva Business-to-Funding Intelligence Design

**Status:** APPROVED FOR PLANNING

**Decision authority:** The user explicitly authorised approval of necessary design decisions for this phase. The decisions below are therefore treated as approved unless later overridden.

## 1. Purpose

This phase makes Cresciva's paid core promise operational:

> **Give Cresciva the name of your organisation. Cresciva understands the business, monitors authoritative funding sources, and shows funding the organisation is actually likely to qualify for and can apply to now.**

The system must distinguish four different questions that were previously too easy to blur together:

1. **Does this organisation exist and what does it do?** — Business Enrichment.
2. **Does this funding opportunity exist?** — Opportunity Provenance.
3. **Is the current application cycle open now?** — Opportunity Status.
4. **Is this specific organisation eligible and a strong fit?** — Eligibility + Recommendation.

No single AI prompt is allowed to own all four answers.

---

## 2. Existing foundation

Cresciva already has:

- a deterministic Recommendation Engine;
- a verified-first Opportunity Search Engine;
- profile fields for country, sector, descriptions, keywords, business stage, funding target, preferred funding types and application readiness;
- curated `funding_opportunities`;
- explicit provenance columns such as `source_url`, `source_name`, `source_retrieved_at`, `source_fingerprint` and `verification_status`;
- a staff-managed `funding_sources` registry;
- shared `fundingTrust` URL canonicalisation and verification-state logic;
- an AI fallback that is forcibly labelled `ai_assisted + unverified`.

This phase extends that foundation. It does not replace it with a second recommendation stack.

---

## 3. Approaches considered

### Approach A — LLM-first business name and funding search

Input the business name into an LLM and ask it to describe the company and list current funding.

**Rejected.** Fast, but it lets model memory own organisation identity, opportunity existence, current-cycle status and eligibility. It cannot support a paid accuracy promise.

### Approach B — Manual business profile only

Require every member to manually complete all matching fields before recommendations appear.

**Rejected as the primary flow.** Safe but creates too much onboarding friction and wastes public information that Cresciva can retrieve.

### Approach C — Evidence-first hybrid enrichment and monitoring

Resolve the organisation from public evidence, extract structured facts, ask the member to confirm ambiguous facts, monitor authoritative opportunity sources, then run deterministic eligibility and ranking.

**Selected.** This preserves explainability and trust while making the product feel intelligent from a business name alone.

---

## 4. System architecture

```text
Business name / optional website / country
             |
             v
BUSINESS IDENTITY RESOLVER
             |
     candidate organisations
             |
     ambiguous? ---- yes ----> member confirmation
             |
             no
             v
BUSINESS EVIDENCE COLLECTOR
 official site > trusted secondary public sources
             |
             v
STRUCTURED ENRICHMENT EXTRACTOR
 AI extracts facts from retrieved evidence only
             |
             v
CONFIDENCE + PROVENANCE
 field-level evidence and source URLs
             |
             v
CONFIRMED FUNDING PROFILE
             |
             +------------------------------+
                                            |
Funding source registry                    |
        |                                   |
        v                                   |
BOUNDED SOURCE REFRESH                      |
        |                                   |
        v                                   |
CURRENT-CYCLE STATUS ENGINE                 |
        |                                   |
        v                                   |
verified opportunity knowledge base        |
        |                                   |
        +-------------> HARD ELIGIBILITY <--+
                             |
                             v
                       MATCH + RANK
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
         OPEN NOW       WATCHLIST       DISCOVERIES
       paid primary     upcoming/       AI/unverified
        experience       unknown
```

---

## 5. Business Enrichment Engine

### 5.1 Input

Minimum input:

```ts
{
  businessName: string;
  website?: string;
  countryHint?: string;
}
```

Business name alone is allowed. Website and country improve resolution.

### 5.2 Identity resolution

The resolver returns zero or more candidate identities:

```ts
interface BusinessIdentityCandidate {
  canonicalName: string;
  website: string | null;
  country: string | null;
  description: string | null;
  sourceUrls: string[];
  identityConfidence: number; // 0-100
}
```

Rules:

- one strong candidate with `identityConfidence >= 85` may be proposed immediately;
- multiple plausible candidates require user selection;
- zero trustworthy candidates falls back to manual profile completion;
- Cresciva must never silently attach a profile to an ambiguous organisation name.

### 5.3 Source priority

1. official organisation website;
2. official government/company/nonprofit registry when available;
3. official funder/partner programme pages describing the organisation;
4. organisation-controlled professional/social profile;
5. reputable public directory or press source.

Secondary sources can support enrichment but must not overrule a conflicting official source without flagging the conflict.

### 5.4 Extracted fields

The extractor may propose:

- canonical business name;
- website;
- headquarters / operating country;
- operating countries;
- organisation type: for-profit, nonprofit, social enterprise, NGO, foundation, association, public body, other;
- sector and subsector;
- business model / programme model;
- business stage;
- founding year;
- description;
- keywords / thematic focus;
- SDG / impact themes;
- geographic focus;
- likely funding preferences;
- evidence links.

Sensitive/protected personal characteristics are never inferred from public data for eligibility. If a funding programme legitimately requires such a characteristic, Cresciva may ask the user to voluntarily provide the relevant fact.

### 5.5 Field-level confidence

Each extracted field carries its own evidence:

```ts
interface EnrichedField<T> {
  value: T;
  confidence: number;
  sourceUrls: string[];
  status: "confirmed" | "proposed" | "conflicting" | "unknown";
}
```

The entire organisation does not get one magical confidence score that hides weak individual fields.

### 5.6 Member confirmation

The user sees:

> We found **Top100 Africa Future Leaders**. Is this your organisation?

They can:

- confirm the identity;
- choose another candidate;
- edit proposed facts;
- add missing facts;
- reject the enrichment and enter the profile manually.

User-confirmed values become the authority for their private recommendation profile. Public evidence remains attached for audit/explanation.

---

## 6. Opportunity provenance and current-cycle status

### 6.1 Verification and open status are separate

`verification_status` answers **does this record have trustworthy evidence?**

`application_status` answers **can someone apply in the current cycle?**

An opportunity can therefore be:

```text
verified + closed
verified + upcoming
verified + rolling
verified + open
stale + unknown
unverified + unknown
```

`verified` must never imply `open`.

### 6.2 Application status enum

```ts
type ApplicationStatus =
  | "open"
  | "closing_soon"
  | "rolling"
  | "upcoming"
  | "closed"
  | "paused"
  | "unknown";
```

### 6.3 Evidence required for OPEN

`open` or `closing_soon` requires all of:

- authoritative `source_url` reachable recently;
- current-cycle evidence, not only a historical programme page;
- an active application CTA/form or explicit official text that applications are open;
- deadline absent because genuinely rolling, or deadline in the future;
- no stronger conflicting source that says closed/paused;
- check timestamp inside the freshness window.

A future-looking deadline alone is not enough to prove open status.

### 6.4 Closing soon

`closing_soon` is derived only after `open` is established. Default threshold: deadline within **14 calendar days**.

### 6.5 Rolling

`rolling` requires explicit official evidence that applications are accepted continuously/throughout the year. It must not be inferred from a missing deadline.

### 6.6 Upcoming

`upcoming` requires an official future opening date or explicit next-cycle announcement.

### 6.7 Closed / paused

Official closed/paused copy overrides stale historical open evidence immediately.

### 6.8 Unknown

Any material uncertainty becomes `unknown`, never an optimistic `open`.

---

## 7. Refresh frequency

Refresh windows are risk-based:

| Opportunity state | Maximum normal source age |
| --- | ---: |
| open, deadline >14 days | 24 hours |
| closing soon | 6 hours |
| rolling | 48 hours |
| upcoming | 24 hours |
| closed | 7 days |
| unknown / conflicting | 12 hours until resolved |

If a refresh is overdue, the UI must not continue presenting the record as freshly open.

---

## 8. Source retrieval safety

All automatic retrieval must be bounded.

Minimum requirements:

- HTTPS preferred; HTTP may redirect to HTTPS;
- DNS/private-network protections to prevent SSRF;
- no localhost, RFC1918, link-local, metadata-service or internal host access;
- redirect cap: 5;
- request timeout: 10 seconds per source;
- response body cap: 2 MiB for HTML/text;
- allowed content types: HTML, plain text and selected JSON feeds;
- no arbitrary file execution;
- store content fingerprints, not unlimited raw-page archives;
- respect provider terms and reasonable refresh intervals.

PDF-only official guidance may be queued for staff review or a separately bounded parser rather than silently skipped as open evidence.

---

## 9. Extraction and truth ownership

AI may:

- identify likely field values from retrieved source text;
- normalise dates and currencies;
- extract eligibility statements;
- summarise reasons;
- identify possible conflicts.

AI may not:

- declare a source authoritative without source classification;
- upgrade `verification_status` itself;
- declare `application_status=open` without deterministic evidence checks;
- manufacture an unknown deadline;
- turn model memory into source evidence;
- override deterministic eligibility.

---

## 10. Eligibility and recommendation integration

### 10.1 Primary paid recommendation gate

An opportunity may enter **Recommended — Open now** only when:

```text
verification_status = verified
AND application_status IN (open, closing_soon, rolling)
AND eligibility_status = eligible
AND source freshness is within the state-specific window
```

A high match score cannot bypass these gates.

### 10.2 Missing member data

If the opportunity is verified/open but member eligibility is not fully confirmable:

> **Strong match — 1 detail needed to confirm eligibility**

It belongs outside the Apply Now list until confirmed.

### 10.3 Watchlist

Use for:

- upcoming current cycle;
- legitimate recurring programme with next cycle not yet open;
- verified opportunity whose open status is temporarily unknown;
- possibly eligible opportunity awaiting one or more profile facts.

### 10.4 Discoveries

AI-assisted or newly discovered records remain separate until source verification succeeds.

---

## 11. Subscriber UX

Funding Radar becomes:

```text
[Open for you] [Closing soon] [Watchlist] [Explore]
```

### Open for you

Only source-verified, current-cycle open/rolling, eligible recommendations.

Each card shows:

- match score;
- `OPEN NOW`, `CLOSING SOON` or `ROLLING`;
- source verification time;
- deadline when confirmed;
- why the organisation qualifies;
- potential non-blocking caveats;
- official source CTA;
- Save / Applied / Not relevant actions.

### Closing soon

A subset of Open for you ordered by confirmed deadline urgency.

### Watchlist

Upcoming/current-cycle unknown programmes and pending-eligibility items.

### Explore

Verified search and clearly separated AI discoveries.

---

## 12. Data model additions

The implementation plans may add or extend:

### `business_enrichment_runs`

- `id`
- `user_id`
- `business_name_input`
- `country_hint`
- `website_hint`
- `status`
- `candidate_count`
- `selected_candidate_id`
- `started_at`
- `completed_at`
- bounded diagnostic metadata

### `business_enrichment_candidates`

- canonical identity fields;
- source URLs;
- identity confidence;
- structured extracted profile;
- field-level evidence JSON;
- member confirmation state.

### `funding_opportunities`

Add/normalise:

- `application_status`;
- `status_checked_at`;
- `status_evidence_url`;
- `opens_at`;
- `deadline_at`;
- `deadline_timezone`;
- `deadline_status` (`confirmed`, `rolling`, `unknown`);
- `current_cycle_label`;
- structured eligibility in `details` initially, with dedicated columns added only when query/rule needs justify them.

### `funding_source_checks`

Append-only bounded history of source checks:

- source/opportunity ID;
- URL;
- HTTP outcome;
- checked_at;
- content fingerprint;
- extracted status signals;
- result classification;
- error class.

---

## 13. Business-name example

Input:

```text
Top100 Africa Future Leaders
```

Target flow:

```text
Resolve candidate organisation
  -> retrieve official website and supporting public evidence
  -> propose: nonprofit/youth leadership/Pan-African/education/social impact/etc.
  -> member confirms or edits
  -> produce confirmed funding profile
  -> retrieve only verified opportunity records
  -> filter to open/current-cycle opportunities
  -> run hard eligibility
  -> rank fit
  -> display only eligible + open records in Open for you
```

The business name is therefore a starting key, not the final search query.

---

## 14. Accuracy metrics and release gates

The paid promise does not ship merely because code compiles.

Minimum launch targets:

| Metric | Release target |
| --- | ---: |
| Primary recommendations with authoritative source evidence | >=95% |
| `open/closing_soon/rolling` labels correct in benchmark review | >=98% |
| Confirmed deadlines sourced rather than model-guessed | 100% |
| Hard eligibility false-positive rate | <2% |
| Broken official-source links | <1% |
| AI discoveries rendered as verified/open | 0 |
| Ambiguous business identities auto-selected incorrectly | 0 in acceptance suite |
| Open-now source age | <=24h, or <=6h when closing soon |

The benchmark set must include at least 100 organisation profiles and 200 opportunity-cycle records before production certification.

---

## 15. Failure behaviour

- business identity ambiguous -> ask user to select;
- enrichment provider unavailable -> preserve existing profile and allow manual entry;
- official source unavailable -> do not upgrade trust; stale/unknown as appropriate;
- conflicting current-cycle evidence -> `unknown` + admin review;
- deadline parser uncertain -> deadline remains unconfirmed;
- current-cycle status stale -> remove from Open for you until refreshed;
- AI unavailable -> verified recommendation/search still functions;
- no eligible open opportunities -> show a truthful zero state and Watchlist, never padded results.

---

## 16. Privacy and safety

- only public business information is automatically enriched;
- do not infer race, religion, health, political affiliation, sexuality or other sensitive personal characteristics;
- founder demographic eligibility fields are user-supplied and optional unless needed for a chosen opportunity;
- store evidence URLs and bounded extraction metadata, not uncontrolled copies of third-party websites;
- member corrections override enrichment output for private recommendation decisions.

---

## 17. Admin operations

Admin must be able to:

- manage source registry entries;
- see sources due for refresh;
- inspect last successful/failed check;
- inspect opportunity status evidence;
- resolve conflicts;
- mark records draft/archived;
- re-run a bounded check;
- never manually force `OPEN` without evidence fields/audit trail.

All admin mutations are audit logged.

---

## 18. Implementation decomposition

This design is intentionally split into four plans:

1. **Business Enrichment Engine** — identity resolution, public evidence extraction, member confirmation and profile persistence.
2. **Open Opportunity Verification Engine** — source registry checks, current-cycle/status classifier and source freshness.
3. **Core Funding Subscriber Experience** — apply-now/watchlist/explore UX and integration with recommendation/search.
4. **Funding Intelligence Accuracy Certification** — benchmark fixtures, precision metrics, freshness SLAs and release gate.

Each plan must be executable independently with TDD and its own reviewer gate.

---

## 19. Approved decisions

The following are approved for implementation planning:

- hybrid evidence-first architecture;
- business-name-only entry allowed;
- user confirmation required for ambiguous identity;
- official sources outrank secondary evidence;
- AI extracts/summarises but does not own truth state;
- `verified` and `open` are separate dimensions;
- Apply Now requires verified + current open/rolling + deterministically eligible;
- unknown or stale evidence is demoted, never guessed;
- zero recommendations is a valid product result;
- current-cycle deadlines are never inferred from historical typical months;
- source checks are bounded and SSRF-safe;
- accuracy certification is a hard release gate for the paid promise.
