# Cresciva Opportunity Status Engine

## What it does

The Opportunity Status Engine answers:

> **Does this funding programme exist, and can an eligible organisation actually apply to the current cycle right now?**

This engine exists because `verified` and `open` are different facts.

A real funding programme can be verified and still be closed. An upcoming programme can be verified but not yet accepting applications. A historical programme page can exist even though there is no current round.

Cresciva therefore models trust and application status separately.

---

## Core process

```text
Funding source registry
        |
        v
Due-source scheduler
        |
        v
Bounded source fetch
        |
        v
HTTP/content validation
        |
        v
Content fingerprint
        |
        v
Status-signal extraction
        |
        +-- explicit current cycle?
        +-- application CTA/form?
        +-- open/close language?
        +-- opening date?
        +-- deadline?
        +-- rolling language?
        |
        v
Deterministic status classifier
        |
        v
Conflict / freshness rules
        |
        v
Application status
 OPEN / CLOSING_SOON / ROLLING /
 UPCOMING / CLOSED / PAUSED / UNKNOWN
        |
        v
Funding Recommendation Engine
```

---

## Truth dimensions

Every curated opportunity should expose at least three independent dimensions.

### 1. Verification status

```ts
"verified" | "stale" | "unverified"
```

Question answered:

> Do we have recent authoritative evidence for the opportunity record?

### 2. Application status

```ts
"open"
| "closing_soon"
| "rolling"
| "upcoming"
| "closed"
| "paused"
| "unknown"
```

Question answered:

> Can applications be submitted in the current cycle?

### 3. Eligibility status

```ts
"eligible"
| "possibly_eligible"
| "insufficient_information"
| "ineligible"
```

Question answered:

> Can this member apply, based on the known criteria?

These states must never be collapsed into one generic `verified` badge.

---

## Source registry

`funding_sources` is the authoritative list of sources Cresciva is allowed to monitor automatically.

A source contains:

- name;
- canonical/base URL;
- source type;
- country focus;
- tags;
- active flag;
- refresh interval;
- last checked/success/error metadata.

Examples of acceptable source types:

- official programme page;
- official funder page;
- government funding portal;
- development-finance institution;
- foundation;
- accelerator/incubator.

Source registry membership does not automatically mean every extracted programme is verified. Each opportunity keeps its own evidence and check state.

---

## Fetch safety

The source worker is not a general browser.

Required controls:

- reject localhost/private/link-local/metadata-service destinations;
- cap redirects at 5;
- request timeout of 10 seconds;
- body limit of 2 MiB for HTML/text/JSON;
- allow only HTTP(S);
- restrict content types;
- do not execute JavaScript from third-party pages;
- do not follow arbitrary downloads;
- record HTTP/result metadata, not unlimited raw pages;
- use a clear Cresciva user agent where appropriate;
- respect source terms and sane refresh rates.

A bad source cannot make Cresciva's server act as an internal-network proxy.

---

## Status evidence

The classifier looks for explicit current-cycle evidence.

Evidence can include:

- `Applications are now open`;
- an active `Apply` CTA associated with the current programme;
- a valid current-cycle application form;
- a current opening date;
- a current future deadline;
- explicit `rolling applications` language;
- `Applications are closed`;
- `Applications open on ...`;
- `Applications paused`;
- a cycle/year marker such as `2026 cohort`.

Historical awards, old recipients and generic programme descriptions prove the programme exists but do not prove the current cycle is open.

---

## Status rules

## OPEN

Requirements:

1. opportunity source is authoritative and reachable;
2. record verification is not unverified;
3. source check is inside the OPEN freshness SLA;
4. current-cycle evidence exists;
5. application intake is explicitly active;
6. confirmed deadline is in the future, or the programme explicitly has no fixed deadline because it is rolling;
7. no stronger conflicting evidence says closed/paused.

A future date alone is not enough.

## CLOSING_SOON

All OPEN requirements plus:

```text
confirmed deadline <= 14 calendar days away
```

The 14-day threshold is product configuration, not source truth.

## ROLLING

Requires explicit official wording that submissions are accepted continuously/rolling/throughout the year.

Missing deadline does not mean rolling.

## UPCOMING

Requires an official future opening date or an explicit statement that the next current cycle will open later.

## CLOSED

Requires current official closed/deadline-passed evidence. A confirmed past deadline can classify closed when the cycle identity is known.

## PAUSED

Requires explicit source evidence that applications or the programme are temporarily suspended.

## UNKNOWN

Use when:

- source is unreachable beyond allowed retry policy;
- current cycle cannot be identified;
- source copy conflicts;
- only historical information exists;
- application CTA state cannot be determined;
- date extraction is ambiguous;
- freshness SLA has expired.

Unknown is a correct result. It is not an error to be hidden.

---

## Current-cycle identity

Cresciva needs to know which round the source evidence refers to.

Suggested fields:

```ts
interface OpportunityCycleEvidence {
  cycleLabel: string | null;       // "2026 cohort", "Round 3", etc.
  opensAt: string | null;
  deadlineAt: string | null;
  deadlineTimezone: string | null;
  applicationUrl: string | null;
  statusEvidenceUrl: string;
  checkedAt: string;
  sourceFingerprint: string;
}
```

If a page contains both 2025 and 2026 information, extraction must not merge the 2025 deadline into the 2026 cycle.

---

## Deadline policy

Deadline has its own status:

```ts
"confirmed" | "rolling" | "unknown"
```

Rules:

- model-generated or historically typical deadlines are never `confirmed`;
- the UI shows an exact deadline only when evidence maps it to the current cycle;
- timezone should be stored when present;
- if the source only says `11:59 PM` without timezone, retain the uncertainty in metadata;
- if dates conflict across authoritative pages, status becomes `unknown` and enters review.

---

## Freshness SLA

| State | Maximum normal age |
| --- | ---: |
| Open | 24h |
| Closing soon | 6h |
| Rolling | 48h |
| Upcoming | 24h |
| Closed | 7d |
| Unknown/conflict | 12h while actively resolving |

When the SLA expires:

- do not keep showing `Open now` unchanged;
- recompute effective state as stale/unknown until refreshed;
- keep the last evidence for audit and user explanation.

---

## Source checks

Each bounded check should create an append-only record similar to:

```ts
interface FundingSourceCheck {
  sourceId?: string;
  opportunityId?: string;
  url: string;
  checkedAt: string;
  httpStatus: number | null;
  contentType: string | null;
  contentBytes: number | null;
  fingerprint: string | null;
  extractedCycle: string | null;
  extractedStatusSignals: string[];
  classifiedStatus: ApplicationStatus;
  errorClass: string | null;
}
```

This history answers:

> Why did Cresciva tell a subscriber this programme was open at that time?

---

## AI's role

AI may extract candidate status signals from bounded source text.

Example:

```json
{
  "cycle_label": "2026 cohort",
  "opening_text": "Applications are now open",
  "deadline_text": "30 September 2026",
  "application_cta_text": "Apply now"
}
```

The deterministic classifier then decides whether these signals satisfy OPEN.

AI cannot return `{"application_status":"open"}` and have that value trusted directly.

---

## Conflict handling

Potential conflict examples:

- programme page says open, application portal says closed;
- funder home page says 2026 open, programme subpage still shows 2025 closed;
- two different deadlines appear;
- source content changes back and forth.

Conflict policy:

1. prefer the most specific official current-cycle application source;
2. prefer newer explicit current-cycle evidence over generic page content;
3. if two strong sources remain irreconcilable, classify `unknown`;
4. create an admin-review item;
5. never choose the optimistic status simply because it improves conversion.

---

## Apply Now eligibility gate

Status Engine output alone does not make a recommendation.

The primary paid list requires:

```text
verification = verified
application status = open | closing_soon | rolling
eligibility = eligible
```

Then the Recommendation Engine ranks those records by fit.

This means:

- verified + closed -> not Apply Now;
- open + unverified -> not Apply Now;
- open + verified + ineligible -> not Apply Now;
- open + verified + insufficient member data -> ask for missing detail;
- open + verified + eligible -> candidate for Apply Now.

---

## Admin workflow

Admin needs views for:

- sources due for refresh;
- sources failing repeatedly;
- opportunity/source conflicts;
- `unknown` current-cycle records;
- deadline conflicts;
- recent status transitions;
- source check history;
- manual recheck.

Manual verification should still require evidence URL and audit information. Admin should not have a one-click `Force open` control with no evidence.

---

## Subscriber-facing labels

### OPEN NOW

```text
OPEN NOW · Verified 3h ago
Deadline: 30 Sep 2026
```

### CLOSING SOON

```text
CLOSING SOON · 4 days left
Verified 2h ago
```

### ROLLING

```text
ROLLING APPLICATIONS
Source checked yesterday
```

### UPCOMING

```text
UPCOMING
Applications open 10 Oct 2026
```

### UNKNOWN

```text
CURRENT STATUS NOT CONFIRMED
Last reliable source check: ...
```

Unknown should not display an Apply Now CTA.

---

## Accuracy targets

- >=98% correct OPEN/CLOSING_SOON/ROLLING labels in benchmark review;
- 100% confirmed deadline fields have current-cycle source evidence;
- 0 AI-only records promoted to OPEN;
- <=1% broken official source links in primary paid recommendations;
- OPEN source age <=24h;
- CLOSING_SOON source age <=6h.

---

## Relationship with Search and Recommendations

```text
Opportunity Search finds relevant records.
Opportunity Status decides current application availability.
Recommendation Engine decides member eligibility and fit.
```

All three consume the same canonical opportunity record but answer different questions.
