# Funding Correction Runbook

Use this runbook for reports that a funding opportunity is closed, has a wrong deadline, wrong eligibility, or a broken/incorrect official source.

## Intake

Member reports enter `funding_opportunity_reports` and are visible at `/admin/funding/reports`. A report is evidence to investigate; it does not automatically change canonical opportunity status.

## Review sequence

1. Open the currently registered authoritative source.
2. Confirm that the source still belongs to the same programme/current cycle.
3. Check the specific reported field (deadline, status, eligibility, source URL).
4. If needed, run the bounded source-refresh path or update the source registry before changing canonical opportunity fields.
5. Never copy an AI discovery into the verified/open surfaces merely because the description sounds plausible.

## When the member is correct

Update the canonical opportunity/source evidence and run the same verification/status rules used by the source-refresh engine. A changed source/program URL invalidates old verification until it is checked again. Mark the member report `resolved` after the canonical record is corrected.

## When the member is incorrect or evidence is inconclusive

- If authoritative evidence contradicts the report, mark it `dismissed` and keep the canonical data.
- If the source is unreachable or ambiguous, demote trust/status to stale/unknown according to the source rules rather than guessing; leave the report `reviewing` until evidence is available.

## Priority

Treat reports affecting an opportunity displayed in **Open for you** or **Closing soon** as high priority because incorrect current-cycle information directly affects the paid subscription promise.

## Audit principle

Keep the member report separate from the canonical source evidence. The report explains why a re-check happened; the official-source evidence explains why Cresciva changed (or did not change) the opportunity.
