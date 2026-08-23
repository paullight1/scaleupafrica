# Cresciva Support & Data-Rights Runbook

## Support intake

Use the monitored Cresciva contact workflow. Do not ask users to send passwords, OTPs, full payment credentials, service-role keys or raw authentication tokens.

Classify incoming requests as:

- account/authentication;
- profile/directory/privacy;
- funding data correction;
- payment/membership;
- email/notification;
- data export/deletion;
- security/abuse;
- general product question.

## Identity-sensitive requests

For requests that change private account data, payment entitlement or deletion state, require the signed-in product flow or another operator-approved identity-verification process. A matching email address in a support message alone is not sufficient to perform a destructive action.

## Data export

Signed-in members can request the JSON export from Account settings. The export is generated server-side and contains account/profile/preferences, member funding activity, business-enrichment evidence/candidates, funding-correction history and the portable payment-ledger fields without raw gateway payloads.

If export fails, troubleshoot the authenticated `account-data` Edge Function; do not assemble exports manually from screenshots or expose service-role database dumps.

## Account deletion

The product requires the exact confirmation phrase plus recent authentication.

Deletion has two safety boundaries:

1. the Edge Function removes the member's `profile-media` objects first; if storage cleanup fails, the account/database graph remains unchanged;
2. deleting `auth.users` then runs the database sanitization trigger in the **same database transaction** as the Auth deletion. That trigger removes direct-email/raw-webhook operational data, anonymises analytics and sanitises/detaches the minimum payment ledger retained for accounting/reconciliation. Owner-linked rows then cascade according to their foreign keys.

A failed Auth/database deletion transaction therefore does not leave a successfully deleted account with half-applied database sanitization. Investigate the returned failure rather than completing a manual partial cascade.

## Profile/privacy correction

Members can edit profile fields and contact visibility through the product. For a public-profile correction that cannot be completed in-app, verify ownership before staff changes. Do not expose private contact fields in tickets, logs or screenshots unnecessarily.

## Security reports

Suspected unauthorized access, private-data exposure or credential leakage is a P0 operational incident. Preserve minimal evidence, disable/contain the affected path where necessary and follow the security/rollback runbooks.

## Funding/payment references

Use opportunity IDs, source URLs and Cresciva/Bachs payment references as support identifiers. Avoid raw provider payloads and private user data in general support channels.
