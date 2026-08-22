# Cresciva Core Subscription Funding Intelligence Flow

## The subscription promise

The core paid experience is not simply a searchable database and it is not an AI list generator.

Cresciva should deliver:

> **Understand my organisation, continuously monitor real funding sources, and show me funding I am actually likely to qualify for and can apply to now.**

This document explains how all Cresciva funding engines combine to deliver that promise.

---

## The complete engine chain

```text
1. BUSINESS INPUT
   "Top100 Africa Future Leaders"
          |
          v
2. BUSINESS ENRICHMENT ENGINE
   Resolve identity -> retrieve evidence -> extract facts -> member confirms
          |
          v
3. CONFIRMED FUNDING PROFILE
   country / sector / organisation type / stage / themes /
   funding target / preferred funding types / readiness
          |
          +-----------------------------------------+
                                                    |
4. OPPORTUNITY SOURCE REGISTRY                     |
   official funder/programme sources               |
          |                                         |
          v                                         |
5. SOURCE REFRESH + PROVENANCE                     |
   fetch -> fingerprint -> source evidence          |
          |                                         |
          v                                         |
6. OPPORTUNITY STATUS ENGINE                       |
   current cycle -> open / rolling / upcoming ...  |
          |                                         |
          +-------------------+---------------------+
                              |
                              v
7. HARD ELIGIBILITY ENGINE
   country / stage / type / explicit criteria
                              |
                              v
8. MATCH + RANK ENGINE
   fit score / confidence / readiness / reasons
                              |
                              v
9. PAID FUNDING RADAR
   Open for you / Closing soon / Watchlist / Explore
                              |
                              v
10. FEEDBACK LOOP
    save / not relevant / applied / result
```

---

## Engine ownership

| Question | Owner |
| --- | --- |
| Which real organisation is this? | Business Enrichment Engine |
| What does the organisation do? | Business Enrichment + member confirmation |
| Does this funding programme exist? | Opportunity Provenance |
| Is the current round accepting applications? | Opportunity Status Engine |
| Is this member eligible? | Hard Eligibility Engine |
| How strong is the fit? | Recommendation Engine |
| What did the member ask to explore? | Opportunity Search Engine |
| Why does Cresciva recommend it? | Deterministic evidence + optional AI explanation |

No engine is allowed to silently take over another engine's truth responsibility.

---

## Paid result classes

## 1. Open for you

This is the core paid list.

A record enters only when:

```text
source verification = verified
AND application status = open | closing_soon | rolling
AND member eligibility = eligible
AND source freshness SLA is satisfied
```

Then it is ranked by match score.

Example:

```text
94% MATCH · OPEN NOW
Verified 4 hours ago

Youth Leadership Innovation Fund
$50k-$150k

Why it matches Top100 Africa Future Leaders
✓ Nigeria / Pan-African eligibility confirmed
✓ Youth leadership focus matches
✓ Nonprofit organisations accepted
✓ Funding type matches your grant preference

Deadline: 30 Sep 2026

[Official source] [Save] [I've applied]
```

## 2. Closing soon

A view of eligible/open records with a confirmed deadline inside the urgency window.

It never includes unverified or current-status-unknown records.

## 3. Watchlist

Legitimate opportunities that are not Apply Now yet.

Examples:

- upcoming next cycle;
- verified recurring programme whose next opening is not confirmed;
- strong profile fit needing one member detail to confirm eligibility;
- verified opportunity whose current status temporarily became unknown.

The Watchlist should support later notifications when a meaningful status changes.

## 4. Explore

Discovery surface for:

- verified opportunities that are not primary recommendations;
- explicit keyword search;
- AI-assisted discoveries.

AI discoveries are always visibly unverified until the source pipeline upgrades the canonical opportunity record.

---

## Business-name-first onboarding

The first-time funding experience should support:

```text
Tell us your organisation
[ Top100 Africa Future Leaders ]

[Find my organisation]
```

Cresciva then proposes a profile rather than forcing the user to complete a long form first.

### Resolved identity

```text
We found your organisation

Top100 Africa Future Leaders
Nigeria · Pan-African youth leadership
https://...

[Use this profile]
[Edit details]
[This isn't mine]
```

### Ambiguous identity

Show up to a small bounded number of likely matches.

### Not found

Offer website input + manual profile fallback.

---

## Profile completeness behaviour

Funding Radar should distinguish public-business understanding from private funding preferences.

Example:

```text
Cresciva understands 78% of your funding profile.

Add your target funding amount
+8% recommendation precision

Confirm your business stage
+10% eligibility precision
```

Do not fabricate missing private information during enrichment.

---

## Recommendation card hierarchy

Collapsed cards should lead with decision-critical information.

1. match score;
2. current application status;
3. verification freshness;
4. title/funder;
5. amount/range;
6. 2-4 match reasons;
7. deadline/urgency;
8. possible blocker;
9. official source and save/apply actions.

Long funder descriptions, recipient history and application tips belong in expanded details.

---

## Apply CTA rules

### `Apply on official site`

Allowed only for verified/currently open or rolling opportunities.

### `View official source`

Available for verified, upcoming, closed or watchlist items with a source.

### `Check this discovery`

Used for AI-assisted/unverified results.

Do not label an unverified AI result `Apply now` simply because it contains a URL.

---

## Member eligibility states

### Eligible

All known hard requirements pass.

### Possibly eligible

No known blocker, but the opportunity itself lacks enough structured criteria.

### Insufficient information

The opportunity has a hard criterion but the member profile lacks the corresponding fact.

Example:

```text
Strong match — confirm your business stage to check eligibility.
```

### Ineligible

A known hard criterion fails.

Never show in Open for you.

---

## Trust language

Cresciva should use precise language.

### Good

- `Official source verified 4h ago`
- `Applications open`
- `Deadline confirmed from official source`
- `Likely eligible based on your confirmed profile`
- `Current application status not confirmed`
- `AI discovery · not yet verified`

### Avoid

- `Guaranteed funding`
- `You will qualify`
- `Verified` when only a URL exists
- `Open now` based on a model-generated deadline
- `We checked dozens of funders` unless live retrieval actually happened

---

## Zero-result experience

Zero is valid.

If no verified/open/eligible opportunity exists:

```text
No verified open opportunities match your confirmed profile today.

We are watching 8 relevant programmes:
- 3 upcoming
- 4 awaiting the next cycle
- 1 needs one profile detail

[View Watchlist]
```

This is more trustworthy than padding the result set with uncertain AI results.

---

## Search within the paid experience

Search remains useful but it is secondary to automatic recommendations.

User query:

```text
climate grant for expansion to Kenya
```

Flow:

1. search verified knowledge base;
2. status-filter current opportunities;
3. apply profile eligibility when available;
4. return verified results first;
5. AI-assisted long-tail discoveries remain separate.

Search should not bypass the Open/Verified gates just because a user explicitly asked for a programme.

---

## Feedback and application state

The paid experience should capture:

```text
recommendation_impression
recommendation_open
recommendation_save
recommendation_not_relevant
application_started
application_submitted
application_won
application_rejected
opportunity_source_click
```

These signals are initially analytics and personal workflow state.

They must not immediately mutate deterministic eligibility. Later, sufficient real data can support learning-to-rank experiments behind evaluation gates.

---

## Notification behaviour

Future notification eligibility comes from state transitions, not repeated generic emails.

Useful triggers:

- Watchlist -> Open;
- Open -> Closing soon;
- deadline changed;
- source conflict resolved;
- member becomes eligible after profile update;
- new high-fit verified/open opportunity appears.

Do not send alerts for unchanged source refreshes.

---

## Core paid-product service levels

Target production guarantees:

- primary recommendations have authoritative evidence >=95%;
- Open/Closing soon/Rolling correctness >=98% on benchmark;
- confirmed deadline source coverage = 100%;
- hard eligibility false positives <2%;
- AI discoveries promoted directly to primary recommendations = 0;
- primary open links broken <1%;
- Open source freshness <=24h;
- Closing-soon source freshness <=6h.

These are release gates and ongoing operational metrics.

---

## Example: Top100 Africa Future Leaders

Ideal subscriber experience:

```text
Top100 Africa Future Leaders
        ↓
Cresciva resolves the organisation
        ↓
Member confirms:
Pan-African youth leadership / education / nonprofit-social-impact profile
        ↓
Cresciva monitors authoritative funding sources
        ↓
Filters to current open/rolling cycles
        ↓
Checks country, organisation type, stage and other hard criteria
        ↓
Ranks relevant grants/partnerships/sponsorship opportunities
        ↓
Shows only verified + open + eligible opportunities in Open for you
```

This is the experience the membership price should primarily pay for.
